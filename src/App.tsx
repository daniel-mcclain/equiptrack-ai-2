import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import AddVehicle from './pages/AddVehicle';
import EditVehicle from './pages/EditVehicle';
import Equipment from './pages/Equipment';
import Inventory from './pages/Inventory';
import Maintenance from './pages/Maintenance';
import WorkOrders from './pages/WorkOrders';
import AddWorkOrder from './pages/AddWorkOrder';
import EditWorkOrder from './pages/EditWorkOrder';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import CompanySetup from './pages/CompanySetup';
import SubscriptionForm from './pages/SubscriptionForm';
import PaymentSuccess from './pages/PaymentSuccess';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/subscription" element={<SubscriptionForm />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/setup" element={<CompanySetup />} />
        <Route path="/app" element={<Layout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="vehicles/add" element={<AddVehicle />} />
          <Route path="vehicles/edit/:id" element={<EditVehicle />} />
          <Route path="equipment" element={<Equipment />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="workorders" element={<WorkOrders />} />
          <Route path="workorders/add" element={<AddWorkOrder />} />
          <Route path="workorders/edit/:id" element={<EditWorkOrder />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;