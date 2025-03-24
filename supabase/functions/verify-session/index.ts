import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16' // Use stable version
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
      keyLength: stripeKey.length,
      isTest: stripeKey.startsWith('sk_test_')
    });

    // Parse request body
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

    logger.info('Retrieving Stripe checkout session', { 
      requestId, 
      sessionId: `${sessionId.substring(0, 10)}...`,
      companyId 
    });

    // Retrieve the checkout session with expanded subscription
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

    logger.info('Processing session details', {
      requestId,
      sessionId: `${sessionId.substring(0, 10)}...`,
      paymentStatus: session.payment_status,
      subscriptionId: subscription?.id,
      subscriptionStatus: subscription?.status,
      customerId: session.customer
    });

    const response = {
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email,
      subscription_id: subscription?.id,
      customer_id: session.customer,
      plan: subscription?.items?.data[0]?.price?.lookup_key || 'unknown',
      price_id: subscription?.items?.data[0]?.price?.id,
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