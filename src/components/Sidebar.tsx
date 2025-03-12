import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  Truck, 
  PenTool as Tools, 
  Calendar, 
  Users, 
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard,
  LogOut
} from 'lucide-react';
import { useSidebarStore } from '../store/sidebarStore';
import { supabase } from '../lib/supabase';

const Sidebar = () => {
  const { isOpen, toggle } = useSidebarStore();
  const navigate = useNavigate();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/app/dashboard' },
    { icon: Truck, label: 'Vehicles', path: '/app/vehicles' },
    { icon: Tools, label: 'Equipment', path: '/app/equipment' },
    { icon: Calendar, label: 'Maintenance', path: '/app/maintenance' },
    { icon: Users, label: 'Operators', path: '/app/operators' },
    { icon: FileText, label: 'Reports', path: '/app/reports' },
    { icon: Settings, label: 'Settings', path: '/app/settings' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
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