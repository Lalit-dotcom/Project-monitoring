import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, HelpCircle } from 'lucide-react';

interface TopbarProps {
  placeholder?: string;
  searchVal?: string;
  onSearchChange?: (val: string) => void;
  action?: React.ReactNode;
  unreadCount?: number;
}

export const Topbar: React.FC<TopbarProps> = ({
  placeholder = "Search projects, invoices, or POs...",
  searchVal = "",
  onSearchChange,
  action,
  unreadCount = 1
}) => {
  return (
    <header className="fixed top-0 right-0 left-[280px] h-16 bg-surface border-b border-outline-variant z-30 px-8 flex items-center justify-between">
      {/* Search Input */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary focus:bg-white transition-all"
            placeholder={placeholder}
            value={searchVal}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-6">
        {/* Help & Notifications */}
        <div className="flex items-center gap-4">
          <Link to="/notifications" className="relative text-secondary hover:text-primary transition-colors">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-error rounded-full" />
            )}
          </Link>
          <button className="text-secondary hover:text-primary transition-colors" title="Help Resources">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-outline-variant" />

        {/* Context-Specific Action */}
        <div className="flex items-center">
          {action}
        </div>
      </div>
    </header>
  );
};
