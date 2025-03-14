import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import Stripe from 'https://esm.sh/stripe@14.18.0';

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PRICE_LOOKUP = {
  starter: 'price_1RwAu7FDX5hmaeD',
  standard: 'price_1RwAv2FDX5hmaeD',
  professional: 'price_1RwAvNFDX5hmaeD'
};

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
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
      return new Response('Method not allowed', { status: 405 });
    }

    // Parse request body
    const { priceId, customerId, companyId, returnUrl } = await req.json();

    // Validate required fields
    if (!priceId || !companyId || !returnUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let customer;
    try {
      if (customerId) {
        // Try to retrieve existing customer
        customer = await stripe.customers.retrieve(customerId);
      }
    } catch (err) {
      // Customer not found or other error - we'll create a new one
      console.log('Customer lookup failed:', err.message);
    }

    if (!customer) {
      // Get company details to create customer
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name, contact_email')
        .eq('id', companyId)
        .single();

      if (companyError || !company) {
        throw new Error('Company not found');
      }

      // Create new customer
      customer = await stripe.customers.create({
        email: company.contact_email,
        name: company.name,
        metadata: {
          company_id: companyId
        }
      });

      // Update company with Stripe customer ID
      await supabase
        .from('companies')
        .update({ stripe_customer_id: customer.id })
        .eq('id', companyId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: PRICE_LOOKUP[priceId as keyof typeof PRICE_LOOKUP],
        quantity: 1,
      }],
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?canceled=true`,
      metadata: {
        company_id: companyId
      }
    });

    // Return session ID
    return new Response(
      JSON.stringify({ sessionId: session.id }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );

  } catch (err) {
    console.error('Error creating checkout session:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
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