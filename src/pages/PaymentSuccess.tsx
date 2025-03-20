import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<{
    plan: string;
    status: string;
    currentPeriodEnd: string;
  } | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError('No session ID found');
        setLoading(false);
        return;
      }

      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No user found');

        // Get user's company
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', user.id)
          .single();

        if (companyError) throw companyError;
        if (!company) throw new Error('No company found');

        // Call your backend to verify the session and update subscription
        const response = await fetch('/api/verify-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.id}`
          },
          body: JSON.stringify({
            sessionId,
            companyId: company.id
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message);
        }

        const result = await response.json();
        setSubscriptionDetails(result);

        // Update company subscription details in database
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            subscription_tier: result.plan,
            subscription_status: result.status,
            current_period_end: result.currentPeriodEnd,
            updated_at: new Date().toISOString()
          })
          .eq('id', company.id);

        if (updateError) throw updateError;

        // Log subscription event
        const { error: eventError } = await supabase
          .from('subscription_events')
          .insert([{
            company_id: company.id,
            event_type: 'subscription_activated',
            event_data: {
              session_id: sessionId,
              plan: result.plan,
              status: result.status,
              current_period_end: result.currentPeriodEnd
            }
          }]);

        if (eventError) throw eventError;

      } catch (err: any) {
        console.error('Error verifying payment:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="mt-3 text-xl font-semibold text-gray-900">
                Payment Verification Failed
              </h1>
              <p className="mt-2 text-sm text-red-600">
                {error}
              </p>
            </div>

            <div className="mt-6">
              <button
                onClick={() => navigate('/app/settings')}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Settings
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="mt-3 text-xl font-semibold text-gray-900">
              Payment Successful!
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Thank you for your subscription. Your account has been updated.
            </p>
          </div>

          {subscriptionDetails && (
            <div className="mt-6">
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Subscription Details
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Plan: {subscriptionDetails.plan}</p>
                      <p>Status: {subscriptionDetails.status}</p>
                      <p>Next billing date: {new Date(subscriptionDetails.currentPeriodEnd).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={() => navigate('/app/dashboard')}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>

          <div className="mt-4">
            <button
              onClick={() => navigate('/app/settings')}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Subscription Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;