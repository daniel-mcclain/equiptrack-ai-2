import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-02-24.acacia', // latest Stripe API version
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: { message: 'Missing sessionId parameter' } }), 
        {
          status: 400,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

    const subscription = session.subscription as Stripe.Subscription;

    return new Response(
      JSON.stringify({
        payment_status: session.payment_status,
        customer_email: session.customer_details?.email,
        subscription_id: session.subscription,
        plan: subscription?.items?.data[0]?.price?.lookup_key || 'unknown',
        status: subscription?.status,
        current_period_end: subscription?.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null
      }),
      {
        status: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error: any) {
    console.error('Error verifying session:', error);
    
    return new Response(
      JSON.stringify({ 
        error: { 
          message: error.message,
          type: error.type
        }
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