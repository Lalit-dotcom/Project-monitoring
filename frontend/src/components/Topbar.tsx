import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, Sun, Moon, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface TopbarProps {
  placeholder?: string;
  searchVal?: string;
  onSearchChange?: (val: string) => void;
  action?: React.ReactNode;
  unreadCount?: number;
  isCollapsed?: boolean;
  /** Called when the hamburger button is clicked (mobile) */
  onHamburgerClick?: () => void;
  backButton?: React.ReactNode;
  /** When false, hides the search input entirely (desktop + mobile). Defaults to true. */
  showSearch?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  placeholder = "Search projects, invoices, or POs...",
  searchVal = "",
  onSearchChange,
  action,
  unreadCount = 1,
  isCollapsed = false,
  onHamburgerClick,
  backButton,
  showSearch = true,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    const moveWidget = () => {
      const widget = document.getElementById('bhashini-translation');
      const container = document.getElementById('bhashini-custom-container');
      if (widget && container) {
        container.appendChild(widget);
        return true;
      }
      return false;
    };

    if (moveWidget()) return;

    const interval = setInterval(() => {
      if (moveWidget()) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-surface border-b border-outline-variant z-30 px-4 md:px-8 flex items-center justify-between transition-all duration-200 ${
        isCollapsed ? 'md:left-[72px]' : 'md:left-[260px]'
      } left-0`}
      aria-label="Top navigation bar"
    >
      {/* Mobile: hamburger button */}
      <button
        onClick={onHamburgerClick}
        className="md:hidden p-2 -ml-1 rounded-md text-secondary hover:text-primary hover:bg-surface-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary mr-2"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Back Button (left of search input) */}
      {!mobileSearchOpen && backButton && (
        <div className="mr-3 md:mr-4 shrink-0 flex items-center">
          {backButton}
        </div>
      )}

      {/* Search Input — hidden on mobile (collapsed to icon). Not rendered when showSearch=false. */}
      {showSearch && !mobileSearchOpen && (
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              aria-label="Global search"
              className="w-full bg-[#F3F4F6] border border-outline-variant rounded-lg pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white transition-all text-on-surface"
              placeholder={placeholder}
              value={searchVal}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Mobile full-width search overlay. Not rendered when showSearch=false. */}
      {showSearch && mobileSearchOpen && (
        <div className="flex flex-1 items-center gap-2 md:hidden">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              aria-label="Global search"
              autoFocus
              className="w-full bg-[#F3F4F6] border border-outline-variant rounded-lg pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white transition-all text-on-surface"
              placeholder={placeholder}
              value={searchVal}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            />
          </div>
          <button
            onClick={() => setMobileSearchOpen(false)}
            className="p-2 rounded-md text-secondary hover:text-primary hover:bg-surface-container transition-colors"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Right Side Actions */}
      <div className="flex items-center gap-3 md:gap-6 ml-auto">
        {/* Mobile: search icon (hidden when search open or showSearch=false) */}
        {showSearch && !mobileSearchOpen && (
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="md:hidden p-2 rounded-md text-secondary hover:text-primary hover:bg-surface-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Open search"
          >
            <Search className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        <div className="flex items-center gap-3 md:gap-4">
          <div id="bhashini-custom-container" className="flex items-center shrink-0" />

          <button
            onClick={toggleTheme}
            className="text-secondary hover:text-primary transition-all duration-150 p-1 hover:bg-surface-container rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Sun className="w-5 h-5" aria-hidden="true" />
            )}
          </button>

          <Link
            to="/notifications"
            className="relative text-secondary hover:text-primary transition-colors p-1 hover:bg-surface-container rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                className="absolute top-0.5 right-0.5 w-2 h-2 bg-error rounded-full"
                aria-hidden="true"
              />
            )}
          </Link>
        </div>

        {/* Divider */}
        {action && (
          <div className="h-8 w-px bg-outline-variant hidden md:block" aria-hidden="true" />
        )}

        {/* Context-Specific Action */}
        {action && (
          <div className="flex items-center">
            {action}
          </div>
        )}
      </div>
    </header>
  );
};
