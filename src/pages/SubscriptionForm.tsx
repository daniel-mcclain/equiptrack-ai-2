import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LocationState {
  currentTier: string;
  newTier: string;
  price: string;
  isUpgrade: boolean;
}

const SubscriptionForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTier, newTier, price, isUpgrade } = location.state as LocationState;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      // Get user's company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (companyError) throw companyError;
      if (!company) throw new Error('No company found');

      // Update company subscription
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          subscription_tier: newTier,
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: nextBillingDate.toISOString(),
          is_trial: false,
        })
        .eq('id', company.id);

      if (updateError) throw updateError;

      // Redirect to settings page with success message
      navigate('/app/settings', { 
        state: { 
          message: `Successfully ${isUpgrade ? 'upgraded' : 'downgraded'} to ${newTier} plan`,
          type: 'success'
        }
      });
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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
              {error && (
                <div className="rounded-md bg-red-50 p-4 mb-6">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

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
                  <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Billing Summary
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-center text-blue-900">
                      <span className="w-48 font-medium">Next Billing Date:</span>
                      <span>{formatDate(nextBillingDate)}</span>
                    </li>
                    <li className="flex items-center text-blue-900">
                      <span className="w-48 font-medium">Amount to be Charged:</span>
                      <span className="font-semibold">${price}</span>
                    </li>
                    <li className="flex items-center text-blue-900">
                      <span className="w-48 font-medium">Billing Period:</span>
                      <span>{formatDate(new Date())} - {formatDate(nextBillingDate)}</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-start">
                    <CreditCard className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <p className="text-sm text-gray-600">
                      Your subscription will be updated immediately. You will be charged the new rate of ${price} on {formatDate(nextBillingDate)}. All prices are in USD and include applicable taxes.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : `Confirm ${isUpgrade ? 'Upgrade' : 'Downgrade'}`}
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