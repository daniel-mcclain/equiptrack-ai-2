import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import Stripe from 'https://esm.sh/stripe@14.18.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Stripe with test key
const stripe = new Stripe(Deno.env.get('STRIPE_TEST_SECRET_KEY') || '', {
  apiVersion: '2024-02-15',
  httpClient: Stripe.createFetchHttpClient(),
  api_key:supabaseServiceKey,
  stripeAccount: undefined, // Add this to ensure no connected account is used
});



// Logger utility for consistent formatting
const logger = {
  info: (message: string, data?: any) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      data
    }));
  },
  error: (message: string, error?: any) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: error?.message || error,
      stack: error?.stack
    }));
  },
  debug: (message: string, data?: any) => {
    console.debug(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message,
      data
    }));
  }
};

interface StripeError extends Error {
  type?: string;
  code?: string;
  decline_code?: string;
  param?: string;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  logger.info('Received subscription verification request', { requestId });

  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      logger.debug('Handling CORS preflight request', { requestId });
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      logger.error('Invalid request method', { requestId, method: req.method });
      return new Response(
        JSON.stringify({ 
          error: { message: 'Method not allowed' },
          requestId
        }), 
        { 
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Log the Stripe key being used (masked)
    const stripeKey = Deno.env.get('STRIPE_TEST_SECRET_KEY') || '';
    logger.debug('Using Stripe key', {
      requestId,
      keyPrefix: stripeKey.substring(0, 7),
      keyLength: stripeKey.length
    });

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (err) {
      logger.error('Failed to parse request body', { requestId, error: err });
      return new Response(
        JSON.stringify({
          error: { message: 'Invalid request body' },
          requestId
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    logger.debug('Parsed request body', { requestId, body: requestBody });

    const { sessionId, companyId } = requestBody;

    // Validate required fields
    if (!sessionId || !companyId) {
      logger.error('Missing required fields', { requestId, sessionId, companyId });
      return new Response(
        JSON.stringify({
          error: { message: 'Missing required fields' },
          requestId
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    logger.info('Retrieving Stripe checkout session', { requestId, sessionId });

    // Retrieve the checkout session with expanded subscription
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'subscription.latest_invoice']
      });
    } catch (err) {
      const stripeError = err as StripeError;
      logger.error('Failed to retrieve Stripe session', {
        requestId,
        error: {
          message: stripeError.message,
          type: stripeError.type,
          code: stripeError.code
        }
      });
      return new Response(
        JSON.stringify({
          error: {
            message: 'Failed to retrieve checkout session',
            details: stripeError.message
          },
          requestId
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    logger.debug('Retrieved checkout session', {
      requestId,
      paymentStatus: session.payment_status,
      customerId: session.customer,
      subscriptionId: session.subscription
    });

    // Verify payment status
    if (session.payment_status !== 'paid') {
      logger.error('Payment not completed', {
        requestId,
        paymentStatus: session.payment_status
      });
      return new Response(
        JSON.stringify({
          error: { message: 'Payment not completed' },
          requestId
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Get subscription details
    const subscription = session.subscription as Stripe.Subscription;
    if (!subscription) {
      logger.error('No subscription found in session', { requestId, sessionId });
      return new Response(
        JSON.stringify({
          error: { message: 'No subscription found' },
          requestId
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    logger.info('Processing subscription details', {
      requestId,
      subscriptionId: subscription.id,
      status: subscription.status
    });

    // Map subscription details
    const status = subscription.status;
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    const plan = subscription.items.data[0].price.lookup_key || 'unknown';
    const priceId = subscription.items.data[0].price.id;

    logger.debug('Mapped subscription details', {
      requestId,
      status,
      currentPeriodEnd,
      plan,
      priceId
    });

    // Update company subscription details
    logger.info('Updating company subscription in database', {
      requestId,
      companyId,
      plan,
      status
    });

    const { error: updateError } = await supabase
      .from('companies')
      .update({
        subscription_tier: plan,
        subscription_status: status,
        current_period_end: currentPeriodEnd.toISOString(),
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        stripe_customer_id: session.customer as string,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId);

    if (updateError) {
      logger.error('Failed to update company subscription', {
        requestId,
        companyId,
        error: updateError
      });
      return new Response(
        JSON.stringify({
          error: { 
            message: 'Failed to update subscription details',
            details: updateError.message
          },
          requestId
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    logger.info('Successfully updated company subscription', {
      requestId,
      companyId,
      subscriptionId: subscription.id
    });

    // Log subscription event
    logger.debug('Logging subscription event', {
      requestId,
      companyId,
      event: 'subscription_verified'
    });

    const { error: eventError } = await supabase
      .from('subscription_events')
      .insert([{
        company_id: companyId,
        event_type: 'subscription_verified',
        event_data: {
          session_id: sessionId,
          subscription_id: subscription.id,
          customer_id: session.customer,
          plan,
          price_id: priceId,
          status,
          current_period_end: currentPeriodEnd.toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          verified_at: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      }]);

    if (eventError) {
      logger.error('Failed to log subscription event', {
        requestId,
        companyId,
        error: eventError
      });
      // Continue since the main operation succeeded
    }

    logger.info('Subscription verification completed successfully', {
      requestId,
      companyId,
      subscriptionId: subscription.id
    });

    // Return subscription details
    return new Response(
      JSON.stringify({
        plan,
        status,
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        customerId: session.customer,
        priceId,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );

  } catch (err) {
    const error = err as Error;
    logger.error('Subscription verification failed', {
      requestId,
      error: {
        message: error.message,
        stack: error.stack
      }
    });

    return new Response(
      JSON.stringify({ 
        error: { message: error.message },
        requestId
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
});