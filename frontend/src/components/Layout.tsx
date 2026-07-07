import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ChevronDown, Plus, CreditCard, Download } from 'lucide-react';
import { api } from '../lib/api';
import type { Notification } from '../types';

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Load notifications to calculate unread counts
  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [location.pathname]);

  // Reset search query on page navigation
  useEffect(() => {
    setSearchQuery('');
  }, [location.pathname]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Determine topbar parameters based on route
  let placeholder = "Search projects, invoices, or POs...";
  let action: React.ReactNode = null;

  if (location.pathname === '/dashboard') {
    placeholder = "Search projects, invoices, or activities...";
    action = (
      <div className="relative group">
        <button className="flex items-center gap-2 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-lg text-sm font-headline font-semibold text-secondary hover:text-primary transition-colors">
          <span>NPMS Enterprise</span>
          <ChevronDown className="w-4 h-4 text-outline" />
        </button>
      </div>
    );
  } else if (location.pathname === '/projects') {
    placeholder = "Search by Project No, client or details...";
    action = (
      <button 
        onClick={() => navigate('/projects')}
        className="bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg font-headline text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        <span>New Project</span>
      </button>
    );
  } else if (location.pathname.startsWith('/projects/')) {
    placeholder = "Search invoices in this project...";
    action = (
      <button 
        onClick={() => navigate('/bill-desk')}
        className="bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg font-headline text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        <span>Create Invoice</span>
      </button>
    );
  } else if (location.pathname === '/bill-desk') {
    placeholder = "Search invoices in bill desk...";
    action = (
      <button 
        onClick={() => navigate('/bill-desk')}
        className="bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg font-headline text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
      >
        <CreditCard className="w-4 h-4" />
        <span>Create Invoice</span>
      </button>
    );
  } else if (location.pathname === '/reports') {
    placeholder = "Search report segments...";
    action = (
      <button 
        onClick={() => alert('Exporting PDF Report...')}
        className="bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg font-headline text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
      >
        <Download className="w-4 h-4" />
        <span>Export PDF</span>
      </button>
    );
  } else if (location.pathname === '/purchase-orders') {
    placeholder = "Search purchase orders...";
  } else if (location.pathname === '/invoices') {
    placeholder = "Search invoices...";
  } else if (location.pathname === '/tax-invoices') {
    placeholder = "Search tax invoices...";
  } else if (location.pathname === '/notifications') {
    placeholder = "Search notifications...";
  } else if (location.pathname === '/administration') {
    placeholder = "Search settings and users...";
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Sidebar Navigation */}
      <Sidebar unreadCount={unreadCount} />

      {/* Top Header Bar */}
      <Topbar
        placeholder={placeholder}
        searchVal={searchQuery}
        onSearchChange={setSearchQuery}
        action={action}
        unreadCount={unreadCount}
      />

      {/* Main Content Layout */}
      <main className="ml-[280px] mt-16 p-8 min-h-[calc(100vh-4rem)] overflow-y-auto">
        <Outlet context={{ searchQuery, unreadCount, reloadNotifications: loadNotifications }} />
      </main>
    </div>
  );
};
