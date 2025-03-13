import React, { useState } from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { PaymentForm } from './PaymentForm';
import { AlertCircle, Check, CreditCard, Calendar } from 'lucide-react';

interface SubscriptionManagerProps {
  currentPlan: string;
  newPlan: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  currentPlan,
  newPlan,
  onSuccess,
  onCancel
}) => {
  const {
    subscription,
    isLoadingSubscription,
    error,
    updateSubscription,
    cancelSubscription
  } = useSubscription();
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (isLoadingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleUpgrade = async () => {
    try {
      await updateSubscription.mutateAsync({ planId: newPlan });
      onSuccess?.();
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleCancel = async () => {
    try {
      await cancelSubscription.mutateAsync();
      onCancel?.();
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900">
            Subscription Details
          </h3>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-gray-400" />
                <span className="ml-2 text-sm text-gray-700">Current Plan</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {currentPlan}
              </span>
            </div>

            {subscription?.endDate && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="ml-2 text-sm text-gray-700">Next Billing Date</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(subscription.endDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {subscription?.isTrial && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Your trial period ends on {' '}
                {new Date(subscription.trialEndsAt!).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="mt-6">
            {showConfirmation ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your current billing period.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Keep Subscription
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Confirm Cancellation
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmation(true)}
                  className="flex-1 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel Subscription
                </button>
                <button
                  onClick={handleUpgrade}
                  className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Upgrade Plan
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};