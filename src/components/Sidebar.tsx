import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  Truck, 
  PenTool as Tools, 
  Calendar, 
  ClipboardList,
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard,
  LogOut,
  Package,
  Building2
} from 'lucide-react';
import { useSidebarStore } from '../store/sidebarStore';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Company {
  id: string;
  name: string;
}

const Sidebar = () => {
  const { isOpen, toggle } = useSidebarStore();
  const navigate = useNavigate();
  const { 
    isAuthenticated, 
    isGlobalAdmin, 
    selectedCompanyId, 
    companyId, 
    switchCompany
  } = useAuth();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);

  const fetchCompanies = useCallback(async () => {
    if (!isGlobalAdmin || companiesLoaded) return;

    try {
      console.log('Fetching available companies for global admin');
      setLoading(true);
      const { data, error } = await supabase.rpc('get_available_companies');
      if (error) throw error;
      console.log('Companies fetched:', data);
      setCompanies(data || []);
      setCompaniesLoaded(true);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  }, [isGlobalAdmin, companiesLoaded]);

  // Fetch company details for regular users
  const fetchUserCompany = useCallback(async () => {
    if (isGlobalAdmin || !companyId || companiesLoaded) return;
    
    try {
      console.log('Fetching company details for regular user');
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', companyId)
        .single();
        
      if (error) throw error;
      console.log('User company fetched:', data);
      setCompanies([data]);
      setCompaniesLoaded(true);
    } catch (err) {
      console.error('Error fetching user company:', err);
    } finally {
      setLoading(false);
    }
  }, [isGlobalAdmin, companyId, companiesLoaded]);

  useEffect(() => {
    if (isAuthenticated) {
      if (isGlobalAdmin) {
        fetchCompanies();
      } else {
        fetchUserCompany();
      }
    }
  }, [isAuthenticated, isGlobalAdmin, fetchCompanies, fetchUserCompany]);

  // Reset companies when auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      setCompanies([]);
      setCompaniesLoaded(false);
    }
  }, [isAuthenticated]);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/app/dashboard' },
    { icon: Truck, label: 'Vehicles', path: '/app/vehicles' },
    { icon: Tools, label: 'Equipment', path: '/app/equipment' },
    { icon: Package, label: 'Inventory', path: '/app/inventory' },
    { icon: Calendar, label: 'Maintenance', path: '/app/maintenance' },
    { icon: ClipboardList, label: 'Work Orders', path: '/app/workorders' },
    { icon: FileText, label: 'Reports', path: '/app/reports' },
    { icon: Settings, label: 'Settings', path: '/app/settings' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleCompanyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log("handleCompanyChange triggered with value:", e.target.value);
    const success = await switchCompany(e.target.value);
    console.log("switchCompany result:", success);
    if (success) {
      console.log("Company switch successful, reloading page");
      window.location.reload();
    }
  };

  // Display company information
  const renderCompanyInfo = () => {
    if (!isAuthenticated || !isOpen) return null;
    
    const currentCompanyName = companies.find(c => 
      c.id === (isGlobalAdmin ? selectedCompanyId : companyId)
    )?.name || 'Select Company';
    
    if (isGlobalAdmin) {
      // Company selector for global admins
      return (
        <div className="px-4 py-3 border-t border-blue-500">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <Building2 size={16} className="text-blue-300" />
              <span className="text-xs text-blue-300">Current Company:</span>
            </div>
            <select
              value={selectedCompanyId || ''}
              onChange={handleCompanyChange}
              disabled={loading}
              className="w-full bg-blue-800 text-white border border-blue-500 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            >
              <option value="">Select Company</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    } else if (companyId) {
      // Company display for regular users
      return (
        <div className="px-4 py-3 border-t border-blue-500">
          <div className="flex items-center space-x-2">
            <Building2 size={16} className="text-blue-300" />
            <div className="flex flex-col">
              <span className="text-xs text-blue-300">Your Company:</span>
              <span className="text-sm text-white font-medium truncate">
                {currentCompanyName}
              </span>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div 
      className={`fixed left-0 top-0 h-full bg-blue-600 text-white transition-all duration-300 flex flex-col ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex items-center justify-between p-6 border-b border-blue-500">
        <Link to="/" className={`font-bold text-xl hover:text-blue-100 transition-colors ${isOpen ? 'block' : 'hidden'}`}>
          equiptrack.ai
        </Link>
        <button
          onClick={toggle}
          className="p-2 rounded hover:bg-blue-700 transition-colors"
        >
          {isOpen ? (
            <ChevronLeft size={20} />
          ) : (
            <ChevronRight size={20} />
          )}
        </button>
      </div>
      
      <nav className="mt-6 flex-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-6 py-4 hover:bg-blue-700 transition-colors ${
                isActive ? 'bg-blue-700' : ''
              }`
            }
          >
            <item.icon size={20} />
            <span className={`ml-4 ${isOpen ? 'block' : 'hidden'}`}>
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Company information section - only show for global admins */}
      {isGlobalAdmin && renderCompanyInfo()}

      <button
        onClick={handleLogout}
        className="flex items-center px-6 py-4 hover:bg-blue-700 transition-colors border-t border-blue-500"
      >
        <LogOut size={20} />
        <span className={`ml-4 ${isOpen ? 'block' : 'hidden'}`}>
          Logout
        </span>
      </button>
    </div>
  );
};

export default Sidebar;