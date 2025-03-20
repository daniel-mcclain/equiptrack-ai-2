import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import Stripe from 'https://esm.sh/stripe@14.18.0';

const stripe = new Stripe(Deno.env.get('STRIPE_TEST_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
  logger.info('finished cors')
    // Only allow POST requests
    if (req.method !== 'POST') {
      logger.error('Invalid request method', { requestId, method: req.method });
      return new Response('Method not allowed', { status: 405 });
    }

    // Parse request body
    const requestBody = await req.json();
    logger.debug('Parsed request body', { requestId, body: requestBody });

    const { sessionId, companyId } = requestBody;

    // Validate required fields
    if (!sessionId || !companyId) {
      logger.error('Missing required fields', { requestId, sessionId, companyId });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Retrieving Stripe checkout session', { requestId, sessionId });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

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
      throw new Error('Payment not completed');
    }

    // Get subscription details
    const subscription = session.subscription as Stripe.Subscription;
    if (!subscription) {
      logger.error('No subscription found in session', { requestId, sessionId });
      throw new Error('No subscription found');
    }

    logger.info('Processing subscription details', {
      requestId,
      subscriptionId: subscription.id,
      status: subscription.status
    });

    // Map subscription status
    const status = subscription.status;
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    const plan = subscription.items.data[0].price.lookup_key || 'unknown';

    logger.debug('Mapped subscription details', {
      requestId,
      status,
      currentPeriodEnd,
      plan
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
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId);

    if (updateError) {
      logger.error('Failed to update company subscription', {
        requestId,
        companyId,
        error: updateError
      });
      throw updateError;
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
          plan,
          status,
          current_period_end: currentPeriodEnd.toISOString(),
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
      // Don't throw here, as the main operation succeeded
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
        currentPeriodEnd: currentPeriodEnd.toISOString()
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
    logger.error('Subscription verification failed', {
      requestId,
      error: err
    });

    return new Response(
      JSON.stringify({ 
        error: err.message,
        requestId // Include requestId in error response for tracking
      }),
      { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
});