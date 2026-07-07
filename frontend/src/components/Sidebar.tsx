import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  FileText, 
  Receipt, 
  CreditCard, 
  FileSpreadsheet, 
  BarChart3, 
  Bell, 
  Settings,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  unreadCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ unreadCount = 1 }) => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: Briefcase },
    { to: '/purchase-orders', label: 'Purchase Orders', icon: FileText },
    { to: '/invoices', label: 'Invoices', icon: Receipt },
    { to: '/bill-desk', label: 'Bill Desk', icon: CreditCard },
    { to: '/tax-invoices', label: 'Tax Invoices', icon: FileSpreadsheet },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: true },
    { to: '/administration', label: 'Administration', icon: ShieldCheck },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full z-40 flex flex-col bg-surface border-r border-outline-variant w-[280px]">
      {/* Top Brand Block */}
      <div className="px-8 py-8 flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
            {/* Custom rounded-square teal icon */}
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-headline text-2xl font-bold tracking-tight text-primary leading-none">NPMS</h1>
            <p className="font-headline text-[10px] text-secondary font-medium tracking-wider uppercase mt-1">
              Billing & Invoices
            </p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `flex items-center justify-between px-4 py-3 rounded-DEFAULT transition-all font-headline text-sm font-medium border-l-4 group relative ${
                  isActive 
                    ? 'bg-primary/10 text-primary border-primary' 
                    : 'text-secondary border-transparent hover:bg-surface-container hover:text-on-surface'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 group-hover:text-primary transition-colors" />
                <span>{item.label}</span>
              </div>
              {item.badge && unreadCount > 0 && (
                <span className="bg-error text-white font-headline font-bold text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Pinned User Info */}
      <div className="p-4 bg-surface-container-low border-t border-outline-variant">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold font-headline text-sm">
              JD
            </div>
            <div>
              <p className="font-headline text-sm font-bold text-on-surface">John Doe</p>
              <p className="text-[10px] text-secondary">Operational Head</p>
            </div>
          </div>
          <NavLink to="/administration" className="text-secondary hover:text-primary transition-colors">
            <Settings className="w-5 h-5" />
          </NavLink>
        </div>
      </div>
    </aside>
  );
};
