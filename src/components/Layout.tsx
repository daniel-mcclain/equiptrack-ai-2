import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSidebarStore } from '../store/sidebarStore';

const Layout = () => {
  const { isOpen } = useSidebarStore();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Add z-50 to ensure sidebar stays on top */}
      <div className="fixed z-50">
        <Sidebar />
      </div>
      <main 
        className={`flex-1 transition-all duration-300 ${
          isOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;