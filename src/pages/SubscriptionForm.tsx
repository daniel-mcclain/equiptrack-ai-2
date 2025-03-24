import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface LocationState {
  currentTier: string;
  newTier: string;
  price: string;
  isUpgrade: boolean;
  paymentLink?: string;
}

const PAYMENT_LINKS = {
  starter: 'https://buy.stripe.com/6oE5o23re2035zi8ww', // Production link
  standard: 'https://buy.stripe.com/6oE17Me5S8or7Hq146',
  professional: 'https://buy.stripe.com/eVa5o2f9WfQT0eY9AD'
};

const SubscriptionForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTier, newTier, price, isUpgrade, paymentLink } = location.state as LocationState;

  // Calculate next billing date (1 month from now)
  const nextBillingDate = new Date();
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use provided payment link or fallback to PAYMENT_LINKS mapping
    const stripeUrl = paymentLink || PAYMENT_LINKS[newTier as keyof typeof PAYMENT_LINKS];
    
    if (stripeUrl) {
      window.location.href = stripeUrl;
    } else {
      // Fallback behavior - navigate to settings
      navigate('/app/settings');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/pricing')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to pricing
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8">
            <div className="flex items-center justify-between border-b pb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {isUpgrade ? 'Upgrade' : 'Downgrade'} Subscription
                </h2>
                <p className="mt-2 text-gray-600">
                  {isUpgrade ? 'Upgrade' : 'Downgrade'} from {currentTier} to {newTier}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">New price</p>
                <p className="text-3xl font-bold text-gray-900">${price}</p>
                <p className="text-sm text-gray-600">/month</p>
              </div>
            </div>

            <div className="mt-8">
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Plan Changes</h3>
                  <ul className="space-y-3">
                    <li className="flex items-center text-gray-700">
                      <span className="w-32 font-medium">Current Plan:</span>
                      <span className="capitalize">{currentTier.replace('_', ' ')}</span>
                    </li>
                    <li className="flex items-center text-gray-700">
                      <span className="w-32 font-medium">New Plan:</span>
                      <span className="capitalize">{newTier.replace('_', ' ')}</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-blue-900 mb-4">
                    Billing Summary
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-center text-blue-900">
                      <span className="w-48 font-medium">Next Billing Date:</span>
                      <span>{formatDate(nextBillingDate)}</span>
                    </li>
                    <li className="flex items-center text-blue-900">
                      <span className="w-48 font-medium">Amount:</span>
                      <span className="font-semibold">${price}</span>
                    </li>
                    <li className="flex items-center text-blue-900">
                      <span className="w-48 font-medium">Billing Period:</span>
                      <span>{formatDate(new Date())} - {formatDate(nextBillingDate)}</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-sm text-gray-600">
                    Your subscription will be updated immediately. The new rate of ${price} will be applied on {formatDate(nextBillingDate)}. All prices are in USD and include applicable taxes.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-8">
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continue to Payment
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionForm;