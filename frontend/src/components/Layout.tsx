import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ChevronDown, Plus, CreditCard, Download } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import type { Notification } from '../types';

export const Layout: React.FC = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Auto-collapse sidebar below 1024px
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    // Close mobile nav on route change
    setIsMobileOpen(false);
  }, [location.pathname]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Determine topbar parameters based on route
  let placeholder = "Search projects, invoices, or POs...";
  let action: React.ReactNode = null;

  if (location.pathname === '/dashboard') {
    placeholder = "Search projects, invoices, or activities...";
    action = (
      <div className="relative group">
        <button
          className="flex items-center gap-2 bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-lg text-sm font-headline font-semibold text-secondary hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Select workspace"
        >
          <span>NPMS Enterprise</span>
          <ChevronDown className="w-4 h-4 text-outline" aria-hidden="true" />
        </button>
      </div>
    );
  } else if (location.pathname === '/projects') {
    placeholder = "Search by Project No, client or details...";
    action = (
      <button
        onClick={() => {
          toast.info('New Project — coming soon');
        }}
        className="bg-[#111827] hover:bg-[#1f2937] text-white px-4 py-2 rounded-full font-headline text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-1"
        aria-label="Create a new project"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        <span>New Project</span>
      </button>
    );
  } else if (location.pathname.startsWith('/projects/')) {
    placeholder = "Search invoices in this project...";
    action = (
      <button
        onClick={() => {
          toast.info('Create Invoice — coming soon');
        }}
        className="bg-[#111827] hover:bg-[#1f2937] text-white px-4 py-2 rounded-full font-headline text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-1"
        aria-label="Create a new invoice for this project"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        <span>Create Invoice</span>
      </button>
    );
  } else if (location.pathname === '/bill-desk') {
    placeholder = "Search invoices in bill desk...";
    action = (
      <button
        onClick={() => {
          toast.info('Create Invoice — coming soon');
        }}
        className="bg-[#111827] hover:bg-[#1f2937] text-white px-4 py-2 rounded-full font-headline text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-1"
        aria-label="Create a new bill desk invoice"
      >
        <CreditCard className="w-4 h-4" aria-hidden="true" />
        <span>Create Invoice</span>
      </button>
    );
  } else if (location.pathname === '/reports') {
    placeholder = "Search report segments...";
    action = (
      <button
        onClick={() => {
          toast.info('Export PDF — coming soon');
        }}
        className="bg-[#111827] hover:bg-[#1f2937] text-white px-4 py-2 rounded-full font-headline text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] focus-visible:ring-offset-1"
        aria-label="Export report as PDF"
      >
        <Download className="w-4 h-4" aria-hidden="true" />
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
      <Sidebar
        unreadCount={unreadCount}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      {/* Top Header Bar */}
      <Topbar
        placeholder={placeholder}
        searchVal={searchQuery}
        onSearchChange={setSearchQuery}
        action={action}
        unreadCount={unreadCount}
        isCollapsed={isCollapsed}
        onHamburgerClick={() => setIsMobileOpen(true)}
      />

      {/* Main Content Layout — with route fade transition */}
      <main
        className={`transition-all duration-200 mt-16 p-4 md:p-8 min-h-[calc(100vh-4rem)] overflow-y-auto ${
          isCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
        }`}
      >
        {/* Key on pathname so each route gets a fresh fade-in */}
        <div key={location.pathname} className="animate-page-fade">
          <Outlet context={{ searchQuery, unreadCount, reloadNotifications: loadNotifications }} />
        </div>
      </main>
    </div>
  );
};
