import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Company {
  subscription_tier: string;
  is_trial: boolean;
  trial_ends_at: string | null;
}

const getTierLevel = (tier: string) => {
  const levels = {
    'test_drive': 0,
    'starter': 1,
    'standard': 2,
    'professional': 3
  };
  return levels[tier as keyof typeof levels] || 0;
};

const PricingTier = ({ 
  name, 
  price, 
  features, 
  isPopular = false, 
  isFree = false, 
  trialDays = null,
  isCurrentTier = false,
  onUpgrade,
  currentTierLevel = 0,
  tierLevel = 0,
  tier
}) => {
  const navigate = useNavigate();
  const isUpgrade = tierLevel > currentTierLevel;
  const buttonText = isCurrentTier 
    ? 'Current Plan'
    : isFree 
    ? 'Start Free Trial'
    : isUpgrade 
    ? 'Upgrade' 
    : 'Downgrade';

  const buttonStyle = isCurrentTier
    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
    : isFree
    ? 'bg-green-600 text-white hover:bg-green-700'
    : isPopular
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-gray-100 text-gray-900 hover:bg-gray-200';

  const handleClick = () => {
    if (!isCurrentTier) {
      navigate('/subscription', {
        state: {
          currentTier: currentTierLevel > 0 ? getTierName(currentTierLevel) : 'No Plan',
          newTier: tier,
          price,
          isUpgrade
        }
      });
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden flex flex-col ${
      isCurrentTier ? 'ring-2 ring-green-500' : isPopular ? 'ring-2 ring-blue-600' : ''
    }`}>
      {isPopular && !isCurrentTier && (
        <div className="bg-blue-600 text-white text-center py-2 text-sm font-medium">
          Most Popular
        </div>
      )}
      {isCurrentTier && (
        <div className="bg-green-500 text-white text-center py-2 text-sm font-medium">
          Current Plan
        </div>
      )}
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        <div className="mt-4">
          {isFree ? (
            <div>
              <span className="text-4xl font-bold text-gray-900">Free</span>
              <span className="text-gray-500 ml-2">for {trialDays} days</span>
            </div>
          ) : (
            <div>
              <span className="text-4xl font-bold text-gray-900">${price}</span>
              <span className="text-gray-500">/month</span>
            </div>
          )}
        </div>
        <ul className="mt-6 space-y-4 flex-1">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-5 w-5 text-blue-600 shrink-0" />
              <span className="ml-3 text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={handleClick}
          disabled={isCurrentTier}
          className={`mt-8 block w-full text-center px-6 py-3 rounded-md text-sm font-medium ${buttonStyle}`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

const getTierName = (level: number): string => {
  const tiers = {
    0: 'test_drive',
    1: 'starter',
    2: 'standard',
    3: 'professional'
  };
  return tiers[level as keyof typeof tiers] || 'test_drive';
};

const Pricing = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: companies, error } = await supabase
          .from('companies')
          .select('subscription_tier, is_trial, trial_ends_at')
          .eq('owner_id', user.id)
          .single();

        if (error) throw error;
        setCompany(companies);
      } catch (err) {
        console.error('Error fetching company data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, []);

  const plans = [
    {
      name: 'Test Drive',
      price: '0',
      features: [
        'Up to 3 vehicles/equipment',
        'Basic maintenance tracking',
        'Email support',
        'Mobile app access',
        'Basic reporting',
        '30-day trial period'
      ],
      isFree: true,
      trialDays: 30,
      tier: 'test_drive'
    },
    {
      name: 'Starter',
      price: '29',
      features: [
        'Up to 10 vehicles/equipment',
        'Basic maintenance tracking',
        'Email support',
        'Mobile app access',
        'Basic reporting',
        'No trial limitations'
      ],
      tier: 'starter'
    },
    {
      name: 'Standard',
      price: '99',
      features: [
        'Up to 50 vehicles/equipment',
        'Advanced maintenance scheduling',
        'Priority support',
        'Real-time tracking',
        'Custom reporting',
        'Team collaboration tools',
        'API access'
      ],
      isPopular: true,
      tier: 'standard'
    },
    {
      name: 'Professional',
      price: '249',
      features: [
        'Up to 250 vehicles/equipment',
        'Custom integrations',
        'Dedicated account manager',
        'Advanced analytics',
        'Custom workflows',
        'SLA guarantee',
        'White-label options'
      ],
      tier: 'professional'
    }
  ];

  const currentTierLevel = company ? getTierLevel(company.subscription_tier) : -1;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Choose the perfect plan for your fleet management needs
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {plans.map((plan) => (
            <PricingTier
              key={plan.name}
              {...plan}
              isCurrentTier={company?.subscription_tier === plan.tier}
              currentTierLevel={currentTierLevel}
              tierLevel={getTierLevel(plan.tier)}
            />
          ))}
        </div>

        <div className="mt-16 bg-blue-50 rounded-2xl">
          <div className="px-6 py-8 sm:p-10">
            <h3 className="text-xl font-semibold text-blue-900">
              Enterprise Solutions
            </h3>
            <p className="mt-2 text-blue-700">
              Need a custom solution for your large fleet? Let's talk about your specific requirements.
            </p>
            <div className="mt-6">
              <Link
                to="/contact"
                className="inline-flex items-center text-blue-600 font-medium hover:text-blue-500"
              >
                Contact our sales team
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8 sm:p-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">30-Day Free Trial</h3>
                <p className="mt-2 text-gray-600">
                  Try our platform risk-free for 30 days. No credit card required.
                </p>
              </div>
            </div>
            <div className="mt-8 space-y-4">
              <div className="flex items-start">
                <Check className="h-5 w-5 text-green-500 shrink-0" />
                <span className="ml-3 text-gray-600">Full access to basic features</span>
              </div>
              <div className="flex items-start">
                <Check className="h-5 w-5 text-green-500 shrink-0" />
                <span className="ml-3 text-gray-600">Manage up to 3 vehicles</span>
              </div>
              <div className="flex items-start">
                <Check className="h-5 w-5 text-green-500 shrink-0" />
                <span className="ml-3 text-gray-600">Email support included</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;