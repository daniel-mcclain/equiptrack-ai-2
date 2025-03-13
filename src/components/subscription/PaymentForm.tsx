import React, { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useSubscription } from '../../hooks/useSubscription';
import { AlertCircle, Check } from 'lucide-react';

interface PaymentFormProps {
  planId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  planId,
  onSuccess,
  onError
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { createSubscription } = useSubscription();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }

      await createSubscription.mutateAsync({
        planId,
        paymentMethodId: paymentMethod.id
      });

      setSucceeded(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
      onError?.(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Details
          </label>
          <div className="border border-gray-300 rounded-md p-4">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {succeeded && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <Check className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-sm text-green-800">Payment successful!</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || processing || succeeded}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {processing ? 'Processing...' : succeeded ? 'Subscribed!' : 'Subscribe Now'}
        </button>
      </div>

      <p className="text-xs text-center text-gray-500">
        Your payment information is securely processed by Stripe.
        We never store your card details.
      </p>
    </form>
  );
};