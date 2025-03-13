import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import Stripe from 'https://esm.sh/stripe@14.18.0';

// Initialize Stripe with secret key
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Webhook handler
const handler = async (req: Request): Promise<Response> => {
  try {
    // Verify request method
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // Get the raw body
    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
    }

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
};

// Handle subscription changes
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;
  const priceId = subscription.items.data[0].price.id;
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;

  try {
    // Get company by Stripe customer ID
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, subscription_tier')
      .eq('stripe_customer_id', customerId)
      .single();

    if (companyError) throw companyError;
    if (!company) throw new Error('Company not found');

    // Map price ID to subscription tier
    const tier = await getPlanTierFromPriceId(priceId);

    // Update company subscription details
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        subscription_tier: tier,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        current_period_end: currentPeriodEnd.toISOString(),
        cancel_at_period_end: cancelAtPeriodEnd,
        is_trial: subscription.status === 'trialing',
        trial_ends_at: subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', company.id);

    if (updateError) throw updateError;

    // Log the subscription change
    await logSubscriptionEvent(company.id, {
      event: 'subscription_updated',
      old_tier: company.subscription_tier,
      new_tier: tier,
      status,
      subscription_id: subscription.id
    });
  } catch (err) {
    console.error('Error handling subscription change:', err);
    throw err;
  }
}

// Handle subscription cancellation
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  try {
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, subscription_tier')
      .eq('stripe_customer_id', customerId)
      .single();

    if (companyError) throw companyError;
    if (!company) throw new Error('Company not found');

    // Update company to free tier
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        subscription_tier: 'test_drive',
        stripe_subscription_id: null,
        stripe_price_id: null,
        current_period_end: null,
        cancel_at_period_end: false,
        is_trial: false,
        trial_ends_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', company.id);

    if (updateError) throw updateError;

    // Log the cancellation
    await logSubscriptionEvent(company.id, {
      event: 'subscription_canceled',
      old_tier: company.subscription_tier,
      new_tier: 'test_drive',
      subscription_id: subscription.id
    });
  } catch (err) {
    console.error('Error handling subscription cancellation:', err);
    throw err;
  }
}

// Handle successful payments
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  try {
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (companyError) throw companyError;
    if (!company) throw new Error('Company not found');

    // Log the successful payment
    await logSubscriptionEvent(company.id, {
      event: 'payment_succeeded',
      amount: invoice.amount_paid,
      invoice_id: invoice.id,
      payment_intent: invoice.payment_intent as string
    });
  } catch (err) {
    console.error('Error handling payment success:', err);
    throw err;
  }
}

// Handle failed payments
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  try {
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (companyError) throw companyError;
    if (!company) throw new Error('Company not found');

    // Log the failed payment
    await logSubscriptionEvent(company.id, {
      event: 'payment_failed',
      amount: invoice.amount_due,
      invoice_id: invoice.id,
      payment_intent: invoice.payment_intent as string,
      failure_reason: invoice.last_finalization_error?.message
    });

    // Notify relevant parties about payment failure
    // This could be implemented as a separate Edge Function
    await notifyPaymentFailure(company.id, invoice);
  } catch (err) {
    console.error('Error handling payment failure:', err);
    throw err;
  }
}

// Helper function to map Stripe price IDs to subscription tiers
async function getPlanTierFromPriceId(priceId: string): Promise<string> {
  // This mapping should match your Stripe product configuration
  const priceTierMap: Record<string, string> = {
    'price_starter': 'starter',
    'price_standard': 'standard',
    'price_professional': 'professional'
  };
  return priceTierMap[priceId] || 'test_drive';
}

// Helper function to log subscription events
async function logSubscriptionEvent(companyId: string, eventData: any) {
  try {
    const { error } = await supabase
      .from('subscription_events')
      .insert([{
        company_id: companyId,
        event_type: eventData.event,
        event_data: eventData,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;
  } catch (err) {
    console.error('Error logging subscription event:', err);
    throw err;
  }
}

// Helper function to notify about payment failures
async function notifyPaymentFailure(companyId: string, invoice: Stripe.Invoice) {
  // Implementation would depend on your notification system
  console.log(`Payment failed for company ${companyId}, invoice ${invoice.id}`);
}

// Start the server
serve(handler);