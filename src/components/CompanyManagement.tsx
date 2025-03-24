import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Users, Package, Calendar, ExternalLink } from 'lucide-react';
import { DEMO_COMPANY, DEMO_TEAM_MEMBERS, DEMO_COMPANY_STATS } from '../data/demoData';
import { useAuth } from '../hooks/useAuth';

interface Company {
  id: string;
  name: string;
  industry: string;
  fleet_size: number;
  subscription_tier: string;
  subscription_start_date: string;
  trial_ends_at: string | null;
  is_trial: boolean;
  max_vehicles: number;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  stripe_customer_id: string | null;
}

const CompanyManagement = () => {
  const { isAuthenticated } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamCount, setTeamCount] = useState(0);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        if (!isAuthenticated) {
          setCompany(DEMO_COMPANY);
          setTeamCount(DEMO_TEAM_MEMBERS.length);
          setLoading(false);
          return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No user found');

        // Fetch company data
        const { data: companies, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('owner_id', user.id)
          .single();

        if (companyError) throw companyError;
        if (!companies) throw new Error('No company found');

        setCompany(companies);

        // Fetch team members count
        const { count, error: teamError } = await supabase
          .from('user_companies')
          .select('*', { count: 'exact' })
          .eq('company_id', companies.id);

        if (teamError) throw teamError;
        setTeamCount(count || 0);

      } catch (err: any) {
        console.error('Error fetching company data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-800">
          {error || 'Unable to load company data'}
        </p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSubscriptionBadgeColor = (tier: string) => {
    switch (tier) {
      case 'professional':
        return 'bg-purple-100 text-purple-800';
      case 'standard':
        return 'bg-blue-100 text-blue-800';
      case 'starter':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStripeCustomerPortalUrl = () => {
    if (!company.stripe_customer_id) return null;
    return `https://dashboard.stripe.com${import.meta.env.DEV ? '/test' : ''}/customers/${company.stripe_customer_id}`;
  };

  return (
    <div className="space-y-6">
      {/* Company Overview */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
            <p className="text-sm text-gray-500 mt-1">Industry: {company.industry}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSubscriptionBadgeColor(company.subscription_tier)}`}>
            {company.subscription_tier.charAt(0).toUpperCase() + company.subscription_tier.slice(1)}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Fleet Size</p>
              <p className="text-2xl font-semibold text-gray-900">{company.fleet_size}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Team Members</p>
              <p className="text-2xl font-semibold text-gray-900">{teamCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Package className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Vehicle Limit</p>
              <p className="text-2xl font-semibold text-gray-900">{company.max_vehicles}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Member Since</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(company.subscription_start_date)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Details */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Details</h3>
        <div className="space-y-4">
          {company.is_trial && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800">Trial Period</h4>
              <p className="text-sm text-blue-600 mt-1">
                Your trial ends on {formatDate(company.trial_ends_at || '')}
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Current Plan</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {company.subscription_tier.charAt(0).toUpperCase() + company.subscription_tier.slice(1)}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Vehicle Limit</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {company.max_vehicles} vehicles
              </p>
            </div>
          </div>

          {company.stripe_customer_id && (
            <div className="mt-2">
              <a
                href={getStripeCustomerPortalUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                View Billing Details in Stripe
                <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={() => window.location.href = '/pricing'}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyManagement;