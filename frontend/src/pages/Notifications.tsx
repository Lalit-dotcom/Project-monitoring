import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bell, Check, CheckCheck, AlertTriangle, Info } from 'lucide-react';
import { api } from '../lib/api';
import type { Notification } from '../types';

export const Notifications: React.FC = () => {
  const { reloadNotifications, searchQuery } = useOutletContext<{ reloadNotifications: () => void; searchQuery: string }>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Client-side filter driven by the navbar search bar
  const q = (searchQuery || '').toLowerCase();
  const filteredNotifications = q
    ? notifications.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.description || '').toLowerCase().includes(q)
      )
    : notifications;

  const loadNotifications = async () => {
    try {
      const result = await api.getNotifications({ pageSize: 100 });
      setNotifications(result.data);
      setUnreadCount(result.unreadCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      await loadNotifications();
      reloadNotifications(); // Sync global layout badge
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      await loadNotifications();
      reloadNotifications(); // Sync global layout badge
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (timeStr: string) => {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return <div className="text-secondary font-headline p-8">Loading notifications feed...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-stack-lg w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-2xl font-bold text-on-surface">Notifications Feed</h2>
          <p className="font-sans text-sm text-secondary mt-1">Real-time alerts regarding compliance warnings, account security events, and system administration updates.</p>
        </div>

        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg font-headline text-sm font-semibold transition-all"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-md shadow-sm divide-y divide-outline-variant">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-secondary font-headline flex flex-col items-center gap-3">
            <Bell className="w-8 h-8 opacity-40 text-secondary" />
            <span>All caught up! You have no notifications.</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-secondary font-headline flex flex-col items-center gap-3">
            <Bell className="w-8 h-8 opacity-40 text-secondary" />
            <span>No notifications match your search.</span>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => { if (!n.read) handleMarkAsRead(n.id); }}
              className={`p-6 flex gap-4 transition-colors cursor-pointer relative group ${
                n.read ? 'bg-surface-container-lowest hover:bg-surface-container-low/20' : 'bg-primary/5 hover:bg-primary/10'
              }`}
            >
              {/* Type Icon */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                n.type === 'success' 
                  ? 'bg-primary/10 text-primary' 
                  : n.type === 'warning' 
                  ? 'bg-error/10 text-error' 
                  : 'bg-secondary/10 text-secondary'
              }`}>
                {n.type === 'success' ? (
                  <Check className="w-5 h-5" />
                ) : n.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              {/* Title & Description */}
              <div className="flex-1 font-sans pr-6">
                <div className="flex items-baseline justify-between gap-4">
                  <p className={`text-sm leading-tight ${n.read ? 'text-on-surface font-semibold' : 'text-on-surface font-extrabold'}`}>
                    {n.title}
                  </p>
                  <span className="text-[10px] text-secondary opacity-60 shrink-0">{formatTime(n.timestamp)}</span>
                </div>
                <p className="text-secondary text-xs mt-1.5 leading-relaxed">{n.description}</p>
              </div>

              {/* Unread Indicator Dot */}
              {!n.read && (
                <div className="absolute right-6 top-6 w-2.5 h-2.5 bg-primary rounded-full" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
