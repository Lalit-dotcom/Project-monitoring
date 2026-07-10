import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
import { Managers } from './pages/Managers';
import { AI } from './pages/AI';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* Custom React Toastify Container */}
        <ToastContainer
          position="top-right"
          autoClose={4000}
          hideProgressBar={true}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss={false}
          draggable={false}
          pauseOnHover={true}
          closeButton={false}
        />
        <BrowserRouter>
          <Routes>
          {/* Authentication standalone route */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            {/* Global Chrome Layout wrapped routes */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="/projects" element={<ErrorBoundary><Projects /></ErrorBoundary>} />
              <Route path="/projects/:id" element={<ErrorBoundary><ProjectDetail /></ErrorBoundary>} />
              <Route path="/purchase-orders" element={<ErrorBoundary><PurchaseOrders /></ErrorBoundary>} />
              <Route path="/invoices" element={<ErrorBoundary><Invoices /></ErrorBoundary>} />
              <Route path="/bill-desk" element={<ErrorBoundary><BillDesk /></ErrorBoundary>} />
              <Route path="/tax-invoices" element={<ErrorBoundary><TaxInvoices /></ErrorBoundary>} />
              <Route path="/reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
              <Route path="/notifications" element={<ErrorBoundary><Notifications /></ErrorBoundary>} />
              <Route path="/administration" element={<ErrorBoundary><Administration /></ErrorBoundary>} />
              <Route path="/administration/managers" element={<ErrorBoundary><Managers /></ErrorBoundary>} />
              <Route path="/ai" element={<ErrorBoundary><AI /></ErrorBoundary>} />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
  );
};

export default App;
