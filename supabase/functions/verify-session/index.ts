import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16'
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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
      stack: error?.stack,
      code: error?.code,
      type: error?.type
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

const SUBSCRIPTION_TIER_MAP: Record<string, string> = {
  'starter': 'starter',
  'standard': 'standard',
  'professional': 'professional',
  'Starter - 10': 'starter',
  'Standard - 50': 'standard',
  'Professional - 250': 'professional'
};

async function updateCompanySubscription(
  companyId: string,
  subscriptionData: {
    subscription_tier: string;
    stripe_customer_id: string;
    stripe_subscription_id: string;
    stripe_price_id: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    is_trial: boolean;
    trial_ends_at: string | null;
  }
) {
  logger.info('Updating company subscription', { companyId, subscriptionData });

  try {
    const { error } = await supabase
      .from('companies')
      .update({
        subscription_tier: subscriptionData.subscription_tier,
        stripe_customer_id: subscriptionData.stripe_customer_id,
        stripe_subscription_id: subscriptionData.stripe_subscription_id,
        stripe_price_id: subscriptionData.stripe_price_id,
        current_period_end: subscriptionData.current_period_end,
        cancel_at_period_end: subscriptionData.cancel_at_period_end,
        is_trial: subscriptionData.is_trial,
        trial_ends_at: subscriptionData.trial_ends_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId);

    if (error) throw error;

    // Log subscription event
    const { error: eventError } = await supabase
      .from('subscription_events')
      .insert([{
        company_id: companyId,
        event_type: 'subscription_updated',
        event_data: subscriptionData,
        created_at: new Date().toISOString()
      }]);

    if (eventError) {
      logger.error('Failed to log subscription event', { companyId, error: eventError });
    }

    logger.info('Successfully updated company subscription', { companyId });
    return true;
  } catch (error) {
    logger.error('Failed to update company subscription', { companyId, error });
    throw error;
  }
}

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  logger.info('Received session verification request', { requestId });

  if (req.method === 'OPTIONS') {
    logger.debug('Handling CORS preflight request', { requestId });
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

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
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
      logger.debug('Parsed request body', { 
        requestId, 
        body: {
          ...requestBody,
          sessionId: requestBody.sessionId ? `${requestBody.sessionId.substring(0, 10)}...` : null
        }
      });
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
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const { sessionId, companyId } = requestBody;

    if (!sessionId || !companyId) {
      logger.error('Missing required parameters', { requestId, sessionId, companyId });
      return new Response(
        JSON.stringify({
          error: { message: 'Missing required parameters' },
          requestId
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    logger.info('Retrieving Stripe checkout session', { 
      requestId, 
      sessionId: `${sessionId.substring(0, 10)}...`,
      companyId 
    });

    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(
        sessionId,
        {
          expand: [
            'subscription',
            'subscription.default_payment_method',
            'subscription.latest_invoice',
            'payment_intent'
          ]
        }
      );

      logger.debug('Retrieved checkout session', {
        requestId,
        sessionId: `${sessionId.substring(0, 10)}...`,
        paymentStatus: session.payment_status,
        customerId: session.customer,
        subscriptionId: session.subscription?.id,
        mode: session.mode,
        status: session.status
      });

    } catch (err) {
      logger.error('Failed to retrieve Stripe session', {
        requestId,
        sessionId: `${sessionId.substring(0, 10)}...`,
        error: {
          message: err.message,
          type: err.type,
          code: err.code
        }
      });

      return new Response(
        JSON.stringify({
          error: {
            message: 'Failed to retrieve checkout session',
            details: err.message,
            code: err.code
          },
          requestId
        }),
        {
          status: err.statusCode || 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const subscription = session.subscription as Stripe.Subscription;

    if (!subscription) {
      logger.error('No subscription found in session', { requestId, sessionId });
      return new Response(
        JSON.stringify({
          error: { message: 'No subscription found in session' },
          requestId
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    logger.info('Processing session details', {
      requestId,
      sessionId: `${sessionId.substring(0, 10)}...`,
      paymentStatus: session.payment_status,
      subscriptionId: subscription?.id,
      subscriptionStatus: subscription?.status,
      customerId: session.customer
    });

    // Get subscription tier from the price lookup key or subscription item name
    const subscriptionItem = subscription.items.data[0];
    const priceId = subscriptionItem.price.id;
    const lookupKey = subscriptionItem.price.lookup_key;
    const productName = subscriptionItem.price.product as string;
    
    // Map subscription tier using lookup key, product name, or fallback
    let subscriptionTier = 'starter'; // Default fallback
    logger.debug('subscriptionINFO:',{subscriptionItem});
    if (lookupKey && SUBSCRIPTION_TIER_MAP[lookupKey]) {
      subscriptionTier = SUBSCRIPTION_TIER_MAP[lookupKey];
    } else if (productName && SUBSCRIPTION_TIER_MAP[productName]) {
      subscriptionTier = SUBSCRIPTION_TIER_MAP[productName];
    } else if (requestBody.subscription && SUBSCRIPTION_TIER_MAP[requestBody.subscription]) {
      subscriptionTier = SUBSCRIPTION_TIER_MAP[requestBody.subscription];
    }

    logger.debug('Mapped subscription tier', {
      requestId,
      priceId,
      lookupKey,
      productName,
      subscriptionTier,
      originalSubscription: requestBody.subscription
    });

    // Update subscription in database
    await updateCompanySubscription(companyId, {
      subscription_tier: subscriptionTier,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      is_trial: subscription.status === 'trialing',
      trial_ends_at: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null
    });

    const response = {
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      subscription_id: subscription?.id,
      customer_id: session.customer,
      plan: subscriptionTier,
      price_id: priceId,
      status: subscription?.status,
      current_period_end: subscription?.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription?.cancel_at_period_end || false,
      requestId
    };

    logger.info('Sending successful response', { 
      requestId,
      sessionId: `${sessionId.substring(0, 10)}...`,
      response: {
        ...response,
        subscription_id: response.subscription_id ? `${response.subscription_id.substring(0, 10)}...` : null,
        customer_id: response.customer_id ? `${response.customer_id.substring(0, 10)}...` : null
      }
    });

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error: any) {
    logger.error('Session verification failed', {
      requestId,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
        type: error.type
      }
    });

    return new Response(
      JSON.stringify({ 
        error: { 
          message: error.message,
          code: error.code,
          type: error.type
        },
        requestId
      }),
      {
        status: error.statusCode || 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});