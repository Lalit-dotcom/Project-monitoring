import React, { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  duration?: number;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, duration = 4000, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.05)] transition-all duration-300 animate-slide-up">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        <CheckCircle2 className="w-4 h-4" />
      </div>
      <p className="font-headline text-sm font-semibold text-on-surface">{message}</p>
      <button 
        onClick={() => {
          setVisible(false);
          if (onClose) onClose();
        }} 
        className="text-secondary hover:text-on-surface ml-2 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
