export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  maxVehicles: number;
}

export interface SubscriptionStatus {
  isActive: boolean;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
}