import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  Truck, 
  BarChart, 
  Users, 
  ArrowRight,
  Wrench,
  Calendar,
  Bell,
  Smartphone,
  Shield,
  Clock,
  Settings,
  FileText,
  Link as LinkIcon,
  Code
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/app/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold">equiptrack.ai</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
              <Link to="/app/dashboard" className="text-gray-600 hover:text-gray-900">Demo</Link>
              <Link to="/auth" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block">Manage your fleet with</span>
                  <span className="block text-blue-600">complete control</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Track, maintain, and optimize your equipment fleet with our comprehensive management solution.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link
                      to="/pricing"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                    >
                      Get Started
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link
                      to="/app/dashboard"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 md:py-4 md:text-lg md:px-10"
                    >
                      Live Demo
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center mb-16">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to manage your fleet
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              A comprehensive solution designed for modern equipment management
            </p>
          </div>

          <div className="grid grid-cols-1 gap-y-12 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Wrench className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-16">
                <h3 className="text-lg font-medium text-gray-900">Maintenance Management</h3>
                <p className="mt-2 text-base text-gray-500">
                  Schedule and track maintenance tasks, set up preventive maintenance schedules, and manage work orders efficiently.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <BarChart className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-16">
                <h3 className="text-lg font-medium text-gray-900">Real-time Analytics</h3>
                <p className="mt-2 text-base text-gray-500">
                  Get detailed insights into equipment performance, maintenance costs, and utilization rates with advanced reporting.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-16">
                <h3 className="text-lg font-medium text-gray-900">Smart Scheduling</h3>
                <p className="mt-2 text-base text-gray-500">
                  AI-powered scheduling system that optimizes maintenance timing and resource allocation.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Bell className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-16">
                <h3 className="text-lg font-medium text-gray-900">Proactive Alerts</h3>
                <p className="mt-2 text-base text-gray-500">
                  Receive instant notifications for maintenance due dates, equipment issues, and critical updates.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Smartphone className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-16">
                <h3 className="text-lg font-medium text-gray-900">Mobile Access</h3>
                <p className="mt-2 text-base text-gray-500">
                  Access your fleet management system anywhere with our mobile-responsive platform and dedicated app.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-16">
                <h3 className="text-lg font-medium text-gray-900">Digital Documentation</h3>
                <p className="mt-2 text-base text-gray-500">
                  Keep all equipment documentation, maintenance records, and compliance certificates in one secure place.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-16">
                <h3 className="text-lg font-medium text-gray-900">Team Collaboration</h3>
                <p className="mt-2 text-base text-gray-500">
                  Enable seamless communication between technicians, managers, and operators with built-in collaboration tools.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-16">
                <h3 className="text-lg font-medium text-gray-900">Time Tracking</h3>
                <p className="mt-2 text-base text-gray-500">
                  Monitor work hours, track maintenance duration, and analyze labor efficiency with integrated time tracking.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Code className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-16">
                <h3 className="text-lg font-medium text-gray-900">Custom API Integration</h3>
                <p className="mt-2 text-base text-gray-500">
                  Build custom applications and integrations with our comprehensive REST API and webhooks system.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <LinkIcon className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-16">
                <h3 className="text-lg font-medium text-gray-900">Samsara Integration</h3>
                <p className="mt-2 text-base text-gray-500">
                  Seamlessly connect with Samsara's IoT platform for real-time telematics, GPS tracking, and diagnostic data.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-0 top-0 -mt-2">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Settings className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-16">
                <h3 className="text-lg font-medium text-gray-900">Custom Workflows</h3>
                <p className="mt-2 text-base text-gray-500">
                  Create and customize maintenance workflows, checklists, and approval processes to match your needs.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-24 bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-8 sm:p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Code className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Developer-Friendly APIs</h3>
                  <p className="mt-2 text-gray-600">Build custom solutions with our powerful API platform</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">RESTful API</h4>
                  <p className="text-sm text-gray-600">
                    Comprehensive REST API with detailed documentation and examples
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Webhooks</h4>
                  <p className="text-sm text-gray-600">
                    Real-time event notifications for seamless integrations
                  </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">SDK Support</h4>
                  <p className="text-sm text-gray-600">
                    Official SDKs for popular programming languages
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block text-blue-200">Start your free trial today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
              >
                Get started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;