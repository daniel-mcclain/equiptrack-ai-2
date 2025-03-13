export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  maxVehicles: number;
  stripePriceId: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}