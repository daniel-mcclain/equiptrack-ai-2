import { loadStripe } from '@stripe/stripe-js';

// Replace with your publishable key from Stripe Dashboard
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

if (!stripePublicKey) {
  throw new Error('Missing Stripe publishable key');
}

export const stripe = loadStripe(stripePublicKey);