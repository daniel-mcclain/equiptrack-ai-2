import React, { useState, useEffect } from 'react';
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
  const { isAuthenticated, isGlobalAdmin, selectedCompanyId, switchCompany } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      if (!isGlobalAdmin) return;

      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_available_companies');
        if (error) throw error;
        setCompanies(data || []);
      } catch (err) {
        console.error('Error fetching companies:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && isGlobalAdmin) {
      fetchCompanies();
    }
  }, [isAuthenticated, isGlobalAdmin]);

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

      {/* Only render company selector if user is global admin and sidebar is open */}
      {isGlobalAdmin && isOpen && (
        <div className="px-4 py-3 border-t border-blue-500">
          <div className="flex items-center space-x-2">
            <Building2 size={16} className="text-blue-300" />
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
      )}

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