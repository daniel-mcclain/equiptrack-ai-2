import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { stripe } from '../lib/stripe';
import type { SubscriptionPlan, SubscriptionStatus, PaymentMethod } from '../types/subscription';

export const useSubscription = () => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: company } = await supabase
        .from('companies')
        .select('subscription_tier, subscription_end_date, is_trial, trial_ends_at')
        .eq('owner_id', user.id)
        .single();

      if (!company) throw new Error('No company found');

      return {
        tier: company.subscription_tier,
        endDate: company.subscription_end_date,
        isTrial: company.is_trial,
        trialEndsAt: company.trial_ends_at
      };
    }
  });

  const createSubscription = useMutation({
    mutationFn: async ({ planId, paymentMethodId }: { planId: string; paymentMethodId: string }) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        // Call your backend endpoint to create subscription
        const response = await fetch('/api/create-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.id}`
          },
          body: JSON.stringify({
            planId,
            paymentMethodId
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message);
        }

        const result = await response.json();
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  });

  const updateSubscription = useMutation({
    mutationFn: async ({ planId }: { planId: string }) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        // Call your backend endpoint to update subscription
        const response = await fetch('/api/update-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.id}`
          },
          body: JSON.stringify({ planId })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message);
        }

        const result = await response.json();
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  });

  const cancelSubscription = useMutation({
    mutationFn: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        // Call your backend endpoint to cancel subscription
        const response = await fetch('/api/cancel-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.id}`
          }
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message);
        }

        const result = await response.json();
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
  });

  const updatePaymentMethod = useMutation({
    mutationFn: async ({ paymentMethodId }: { paymentMethodId: string }) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        // Call your backend endpoint to update payment method
        const response = await fetch('/api/update-payment-method', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.id}`
          },
          body: JSON.stringify({ paymentMethodId })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message);
        }

        const result = await response.json();
        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    }
  });

  return {
    subscription,
    isLoadingSubscription,
    error,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    updatePaymentMethod
  };
};