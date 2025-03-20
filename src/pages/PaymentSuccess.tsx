import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Optional: You can use the session_id to verify the payment status
    console.log('Payment session ID:', sessionId);
  }, [sessionId]);

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

          <div className="mt-6">
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Your subscription is now active
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>
                      You now have access to all features included in your subscription plan.
                      Visit your dashboard to start exploring.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

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