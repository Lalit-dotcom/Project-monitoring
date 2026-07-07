import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { Invoices } from './pages/Invoices';
import { BillDesk } from './pages/BillDesk';
import { TaxInvoices } from './pages/TaxInvoices';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { Administration } from './pages/Administration';
import { AI } from './pages/AI';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication standalone route */}
        <Route path="/login" element={<Login />} />

        {/* Global Chrome Layout wrapped routes */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/bill-desk" element={<BillDesk />} />
          <Route path="/tax-invoices" element={<TaxInvoices />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/administration" element={<Administration />} />
          <Route path="/ai" element={<AI />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
