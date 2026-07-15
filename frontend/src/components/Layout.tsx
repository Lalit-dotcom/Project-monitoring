import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { AddProjectWizard } from './AddProjectWizard';
import { ChevronLeft } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../lib/toast';


export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      const result = await api.getNotifications({ pageSize: 50 });
      setUnreadCount(result.unreadCount);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [location.pathname]);

  // Reset search query on page navigation
  useEffect(() => {
    setSearchQuery('');
    // Close mobile nav on route change
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Bhashini Translation Re-scan on route changes
  useEffect(() => {
    const preferredLanguage = localStorage.getItem('preferredLanguage');
    if (preferredLanguage && preferredLanguage !== 'en') {
      const timer = setTimeout(() => {
        if (typeof (window as any).translateAllTextNodes === 'function') {
          (window as any).translateAllTextNodes(preferredLanguage);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Determine topbar parameters based on route
  let placeholder = "Search projects, invoices, or POs...";
  let action: React.ReactNode = null;

  if (location.pathname === '/dashboard') {
    placeholder = "Search projects, invoices, or activities...";
    action = null;
  } else if (location.pathname === '/projects') {
    placeholder = "Search by Project No, client or details...";
    action = null;
  } else if (location.pathname.startsWith('/projects/')) {
    placeholder = "Search invoices in this project...";
    action = null;
  } else if (location.pathname === '/bill-desk') {
    placeholder = "Search invoices in bill desk...";
    action = null;
  } else if (location.pathname === '/reports') {
    action = null;
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

  // Consolidated back navigation handler with browser history navigate(-1) and /dashboard fallback
  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  let backButton: React.ReactNode = null;
  const backButtonClass = "h-10 px-4 py-2 border border-outline-variant hover:border-outline text-secondary hover:bg-surface-container-low rounded-full font-sans text-xs font-bold flex items-center gap-2 transition-all bg-white shadow-sm shrink-0";

  const showBackButton = [
    '/purchase-orders',
    '/invoices',
    '/bill-desk',
    '/tax-invoices',
    '/reports',
    '/notifications'
  ].includes(location.pathname) || (location.pathname.startsWith('/projects/') && location.pathname !== '/projects');

  if (showBackButton) {
    backButton = (
      <button onClick={handleBack} className={backButtonClass}>
        <ChevronLeft className="w-4 h-4 shrink-0 text-secondary" />
        <span>Back</span>
      </button>
    );
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
        backButton={backButton}
        showSearch={location.pathname !== '/reports'}
      />

      {/* Main Content Layout — with route fade transition */}
      <main
        className={`transition-all duration-200 mt-16 p-4 md:p-8 min-h-[calc(100vh-4rem)] overflow-y-auto ${
          isCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
        }`}
      >
        {/* Key on pathname so each route gets a fresh fade-in */}
        <div key={location.pathname} className="animate-page-fade">
          <Outlet context={{ searchQuery, unreadCount, reloadNotifications: loadNotifications, projectsRefreshTrigger: refreshTrigger }} />
        </div>
      </main>

      {isWizardOpen && (
        <AddProjectWizard
          onClose={() => setIsWizardOpen(false)}
          onSuccess={(projectCd) => {
            setIsWizardOpen(false);
            toast.success(`Project ${projectCd} created successfully`);
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
};
