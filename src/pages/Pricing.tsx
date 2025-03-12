import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';

const PricingTier = ({ name, price, features, isPopular = false }) => (
  <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${isPopular ? 'ring-2 ring-blue-600' : ''}`}>
    {isPopular && (
      <div className="bg-blue-600 text-white text-center py-2 text-sm font-medium">
        Most Popular
      </div>
    )}
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
      <div className="mt-4">
        <span className="text-4xl font-bold text-gray-900">${price}</span>
        <span className="text-gray-500">/month</span>
      </div>
      <ul className="mt-6 space-y-4">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-blue-600 shrink-0" />
            <span className="ml-3 text-gray-600">{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/auth"
        className={`mt-8 block w-full text-center px-6 py-3 rounded-md text-sm font-medium ${
          isPopular
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        }`}
      >
        Get started
      </Link>
    </div>
  </div>
);

const Pricing = () => {
  const plans = [
    {
      name: 'Starter',
      price: '29',
      features: [
        'Up to 10 vehicles/equipment',
        'Basic maintenance tracking',
        'Email support',
        'Mobile app access',
        'Basic reporting'
      ]
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
      isPopular: true
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
      ]
    }
  ];

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

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {plans.map((plan) => (
            <PricingTier key={plan.name} {...plan} />
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
      </div>
    </div>
  );
};

export default Pricing;