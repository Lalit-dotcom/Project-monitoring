import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Receipt, 
  CreditCard, 
  FileSpreadsheet, 
  BarChart3, 
  Bell, 
  ShieldCheck,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from '../lib/toast';

interface SidebarProps {
  unreadCount?: number;
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  unreadCount = 1,
  isCollapsed,
  onToggle,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutConfirmed = async () => {
    setShowLogoutConfirm(false);
    await logout();
    toast.success('You have been signed out');
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: Briefcase },
    { to: '/purchase-orders', label: 'Purchase Orders', icon: FileText },
    { to: '/invoices', label: 'Invoices', icon: Receipt },
    { to: '/bill-desk', label: 'Bill Desk', icon: CreditCard },
    { to: '/tax-invoices', label: 'Tax Invoices', icon: FileSpreadsheet },
    { to: '/reports', label: 'Reports', icon: BarChart3, dividerAfter: true },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: true, dividerAfter: true },
    ...(user?.role === 'superadmin' ? [
      // Note: The general '/administration' landing route is redundant for superadmin navigation
      // as they only need direct access to the Project Managers dashboard for now.
      // Keeping `/administration` route registered in routing, but unlinked from sidebar.
      { to: '/administration/managers', label: 'Project Managers', icon: ShieldCheck }
    ] : [])
  ];

  // Common styling tokens:
  // Sidebar navy background: #0F1420
  // Active pill background: #1B2333
  // Inactive text: #9CA3AF
  // Accent Left line: Teal-blue (#0EA5E9)

  const renderNavList = (collapsed: boolean, closeMobile?: () => void) => {
    return (
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Site navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={item.to}>
              <NavLink
                to={item.to}
                onClick={closeMobile}
                className={({ isActive }) =>
                  `flex items-center ${
                    collapsed ? 'justify-center' : 'justify-between'
                  } px-4 py-3 rounded-lg transition-all font-headline text-sm font-medium border-l-4 group relative focus-visible:outline-none ${
                    isActive
                      ? 'bg-[#1B2333] text-white border-l-[#0EA5E9]'
                      : 'text-[#9CA3AF] border-transparent hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className="w-5 h-5 transition-colors shrink-0"
                    aria-hidden="true"
                  />
                  {!collapsed && <span>{item.label}</span>}
                </div>

                {/* Collapsed tooltip */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1B2333] text-white text-xs font-semibold rounded-md shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap border border-white/10 font-sans">
                    {item.label}
                  </div>
                )}

                {!collapsed && item.badge && unreadCount > 0 && (
                  <span className="bg-error text-white font-headline font-bold text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
              {item.dividerAfter && (
                <div className="my-3 border-t border-white/10 mx-2" aria-hidden="true" />
              )}
            </React.Fragment>
          );
        })}
      </nav>
    );
  };

  const renderUserBlock = (collapsed: boolean, isMobileView = false) => {
    return (
      <div className="p-4 bg-[#0B0F19] border-t border-white/10 mt-auto">
        <div className="flex items-center justify-between">
          <div
            className={`flex items-center gap-3 relative group/avatar w-full ${
              collapsed ? 'justify-center' : 'justify-between'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-[#1B2333] border border-white/10 flex items-center justify-center text-white font-bold font-headline text-sm uppercase shrink-0 cursor-pointer">
              {user ? (user.prjMgrName || user.username).slice(0, 2) : 'AD'}
            </div>

            {/* Collapsed avatar popout */}
            {collapsed && !isMobileView && (
              <div className="absolute left-full bottom-0 ml-3 bg-[#1B2333] border border-white/10 rounded-lg p-3.5 shadow-md pointer-events-none opacity-0 group-hover/avatar:opacity-100 group-hover/avatar:pointer-events-auto transition-all duration-150 z-50 min-w-[160px] font-sans">
                <p className="font-headline text-xs font-bold text-white truncate max-w-[140px]">
                  {user ? (user.prjMgrName || user.username) : 'Administrator'}
                </p>
                <p className="text-[10px] text-[#9CA3AF] font-bold tracking-wider uppercase mb-3">
                  {user ? (user.role === 'superadmin' ? 'SUPER ADMIN' : 'PROJECT MANAGER') : 'SUPER ADMIN'}
                </p>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-error hover:bg-red-700 text-white font-headline text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors pointer-events-auto shadow-sm"
                  aria-label="Log out of NPMS"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Log Out</span>
                </button>
              </div>
            )}

            {!collapsed && (
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-headline text-sm font-bold text-white truncate max-w-[120px]">
                  {user ? (user.prjMgrName || user.username) : 'Administrator'}
                </p>
                <p className="text-[10px] text-[#9CA3AF] font-bold tracking-wider uppercase">
                  {user ? (user.role === 'superadmin' ? 'Super Admin' : 'Project Manager') : 'Super Admin'}
                </p>
              </div>
            )}

            {!collapsed && (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                aria-label="Log out of NPMS"
                className="text-[#9CA3AF] hover:text-error transition-colors p-1.5 hover:bg-white/5 rounded-md shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <aside
      className={`
        flex flex-col h-full bg-[#0F1420] text-white border-r border-white/5
        transition-all duration-200
        ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}
      `}
      aria-label="Main navigation"
    >
      {/* Top Brand Block */}
      <div
        className={`px-4 py-8 flex items-center justify-between border-b border-white/10 ${
          isCollapsed ? 'flex-col gap-4' : 'px-8'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1B2333] border border-white/10 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
            <Briefcase className="w-6 h-6" aria-hidden="true" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-headline text-2xl font-bold tracking-tight text-white leading-none">
                NPMS
              </h1>
              <p className="font-headline text-[9px] text-[#9CA3AF] font-bold tracking-widest uppercase mt-1.5 leading-tight">
                NICSI PROJECT MONITORING SYSTEM
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Mobile close button */}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="md:hidden p-1.5 hover:bg-white/5 rounded-md text-[#9CA3AF] hover:text-white transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {/* Desktop collapse toggle */}
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-white/5 rounded-md text-[#9CA3AF] hover:text-white transition-colors shrink-0 hidden md:flex"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Nav List */}
      {renderNavList(isCollapsed, onMobileClose)}

      {/* Bottom User Info */}
      {renderUserBlock(isCollapsed)}
    </aside>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <div
        className={`fixed left-0 top-0 h-full z-40 hidden md:flex transition-all duration-200 ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
      >
        {sidebarContent}
      </div>

      {/* Mobile: slide-out drawer */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="sidebar-backdrop md:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <div className="fixed left-0 top-0 h-full z-40 w-[260px] md:hidden animate-fade-in-up">
            <aside
              className="flex flex-col h-full w-full bg-[#0F1420] text-white border-r border-white/5"
              aria-label="Mobile navigation"
            >
              {/* Brand row */}
              <div className="px-8 py-8 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1B2333] border border-white/10 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Briefcase className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h1 className="font-headline text-2xl font-bold tracking-tight text-white leading-none">NPMS</h1>
                    <p className="font-headline text-[9px] text-[#9CA3AF] font-bold tracking-widest uppercase mt-1.5 leading-tight">NICSI PROJECT MONITORING SYSTEM</p>
                  </div>
                </div>
                <button
                  onClick={onMobileClose}
                  className="p-1.5 hover:bg-white/5 rounded-md text-[#9CA3AF] hover:text-white transition-colors"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Nav (Mobile is always expanded) */}
              {renderNavList(false, onMobileClose)}

              {/* User block */}
              {renderUserBlock(false, true)}
            </aside>
          </div>
        </>
      )}

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Sign out of NPMS?"
        description="You will be returned to the login screen. Any unsaved work will be lost."
        confirmLabel="Sign Out"
        cancelLabel="Stay"
        variant="danger"
        onConfirm={handleLogoutConfirmed}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
};
