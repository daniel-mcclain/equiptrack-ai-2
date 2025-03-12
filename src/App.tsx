import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Equipment from './pages/Equipment';
import Maintenance from './pages/Maintenance';
import Operators from './pages/Operators';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import CompanySetup from './pages/CompanySetup';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/setup" element={<CompanySetup />} />
        <Route path="/app" element={<Layout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="equipment" element={<Equipment />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="operators" element={<Operators />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;