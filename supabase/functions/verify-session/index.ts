import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-02-24.acacia'
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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

serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  logger.info('Received session verification request', { requestId });

  // Handle CORS preflight requests
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
    // Log the Stripe key being used (masked)
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
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
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    logger.debug('Parsed request body', { requestId, body: requestBody });

    const { sessionId } = requestBody;
    logger.info('requestBody',{requestBody});

    if (!sessionId) {
      logger.error('Missing sessionId parameter', { requestId });
      return new Response(
        JSON.stringify({
          error: { message: 'Missing sessionId parameter' },
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

    logger.info('Retrieving Stripe checkout session', { requestId, sessionId });

    // Retrieve the checkout session with expanded subscription
    logger.info('sessionid->',{sessionId})
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (err) {
      logger.error('Failed to retrieve Stripe session', {
        requestId,
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
            details: err.message
          },
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

    logger.debug('Retrieved checkout session', {
      requestId,
      paymentStatus: session.payment_status,
      customerId: session.customer,
      subscriptionId: session.subscription
    });

    const subscription = session.subscription as Stripe.Subscription;

    logger.info('Processing session details', {
      requestId,
      sessionId,
      paymentStatus: session.payment_status,
      subscriptionId: subscription?.id,
      subscriptionStatus: subscription?.status
    });

    const response = {
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      subscription_id: session.subscription,
      plan: subscription?.items?.data[0]?.price?.lookup_key || 'unknown',
      status: subscription?.status,
      current_period_end: subscription?.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      requestId
    };

    logger.info('Sending successful response', { requestId, response });

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
        stack: error.stack
      }
    });

    return new Response(
      JSON.stringify({ 
        error: { message: error.message },
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