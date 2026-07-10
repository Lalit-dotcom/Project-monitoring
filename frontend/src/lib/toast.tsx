import React from 'react';
import { toast as rtToast, cssTransition } from 'react-toastify';
import type { ToastOptions } from 'react-toastify';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

// Custom CSS animation-based transition for slide + fade + scale spring entry
export const customTransition = cssTransition({
  enter: 'custom-toast-enter',
  exit: 'custom-toast-exit',
  appendPosition: false
});

interface CustomToastProps {
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  closeToast?: () => void;
  toastProps?: any;
}

export const CustomToast: React.FC<CustomToastProps> = ({ title, message, type, toastProps }) => {
  const autoClose = toastProps?.autoClose || 4000;

  // Icons mapping
  const Icon = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  }[type];

  // Styling token mapping
  const tokens = {
    success: {
      border: 'border-l-[#0D9488]',
      icon: 'text-[#0D9488]',
      badgeBg: 'bg-[#0D9488]/10',
      progressFill: 'bg-gradient-to-r from-[#0D9488] to-[#14B8A6]',
    },
    error: {
      border: 'border-l-[#DC2626]',
      icon: 'text-[#DC2626]',
      badgeBg: 'bg-[#DC2626]/10',
      progressFill: 'bg-gradient-to-r from-[#DC2626] to-[#EF4444]',
    },
    warning: {
      border: 'border-l-[#D97706]',
      icon: 'text-[#D97706]',
      badgeBg: 'bg-[#D97706]/10',
      progressFill: 'bg-gradient-to-r from-[#D97706] to-[#F59E0B]',
    },
    info: {
      border: 'border-l-[#1B3E7A]',
      icon: 'text-[#1B3E7A]',
      badgeBg: 'bg-[#1B3E7A]/10',
      progressFill: 'bg-gradient-to-r from-[#1B3E7A] to-[#2563EB]',
    },
  }[type];

  return (
    <div 
      className="flex items-center gap-3.5 bg-[#FAFBFD] border border-[#F0F2F5] p-[16px_18px] rounded-2xl shadow-[0_2px_8px_rgba(20,51,92,0.08),0_8px_32px_rgba(20,51,92,0.04)] relative overflow-hidden custom-toast-container w-full transition-all duration-300 select-none cursor-default"
      style={{ '--toast-duration': `${autoClose}ms` } as React.CSSProperties}
    >
      {/* Soft colored circular badge icon */}
      <div className={`w-9 h-9 rounded-full ${tokens.badgeBg} flex items-center justify-center ${tokens.icon} shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Text Block */}
      <div className="flex-1 flex flex-col justify-center min-w-0 pr-2">
        {title ? (
          <>
            <span className="text-[#1E293B] text-sm font-bold tracking-tight leading-[1.4] mb-0.5 truncate">
              {title}
            </span>
            <span className="text-[#64748B] text-[13px] font-medium leading-[1.4] break-words">
              {message}
            </span>
          </>
        ) : (
          <span className="text-[#334155] text-sm font-semibold leading-[1.4] break-words">
            {message}
          </span>
        )}
      </div>

      {/* Modern Pill Inset Progress Bar */}
      <div className="absolute bottom-[4px] left-[16px] right-[16px] h-[3px] bg-[#F1F3F5] rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${tokens.progressFill} custom-progress-bar`} 
        />
      </div>
    </div>
  );
};

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 4000,
  hideProgressBar: true,
  closeButton: false,
  pauseOnHover: true,
  draggable: false,
  transition: customTransition,
};

export const toast = {
  success: (messageOrTitle: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions) => {
    const isDouble = typeof messageOrOptions === 'string';
    const title = isDouble ? messageOrTitle : undefined;
    const msg = isDouble ? (messageOrOptions as string) : messageOrTitle;
    const opt = isDouble ? options : (messageOrOptions as ToastOptions);

    return rtToast(({ closeToast, toastProps }) => (
      <CustomToast title={title} message={msg} type="success" closeToast={closeToast} toastProps={toastProps} />
    ), { ...defaultOptions, ...opt });
  },
  error: (messageOrTitle: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions) => {
    const isDouble = typeof messageOrOptions === 'string';
    const title = isDouble ? messageOrTitle : undefined;
    const msg = isDouble ? (messageOrOptions as string) : messageOrTitle;
    const opt = isDouble ? options : (messageOrOptions as ToastOptions);

    return rtToast(({ closeToast, toastProps }) => (
      <CustomToast title={title} message={msg} type="error" closeToast={closeToast} toastProps={toastProps} />
    ), { ...defaultOptions, ...opt });
  },
  warning: (messageOrTitle: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions) => {
    const isDouble = typeof messageOrOptions === 'string';
    const title = isDouble ? messageOrTitle : undefined;
    const msg = isDouble ? (messageOrOptions as string) : messageOrTitle;
    const opt = isDouble ? options : (messageOrOptions as ToastOptions);

    return rtToast(({ closeToast, toastProps }) => (
      <CustomToast title={title} message={msg} type="warning" closeToast={closeToast} toastProps={toastProps} />
    ), { ...defaultOptions, ...opt });
  },
  info: (messageOrTitle: string, messageOrOptions?: string | ToastOptions, options?: ToastOptions) => {
    const isDouble = typeof messageOrOptions === 'string';
    const title = isDouble ? messageOrTitle : undefined;
    const msg = isDouble ? (messageOrOptions as string) : messageOrTitle;
    const opt = isDouble ? options : (messageOrOptions as ToastOptions);

    return rtToast(({ closeToast, toastProps }) => (
      <CustomToast title={title} message={msg} type="info" closeToast={closeToast} toastProps={toastProps} />
    ), { ...defaultOptions, ...opt });
  },
};

// Reusable showToast helper for anywhere in NPMS
export const showToast = (
  type: 'success' | 'error' | 'warning' | 'info',
  titleOrMessage: string,
  message?: string
) => {
  if (message) {
    return toast[type](titleOrMessage, message);
  }
  return toast[type](titleOrMessage);
};
