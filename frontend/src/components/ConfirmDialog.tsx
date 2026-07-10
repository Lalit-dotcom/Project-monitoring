import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Centered confirmation modal with dimmed backdrop.
 * Closes on Escape or backdrop click.
 * One allowed diffusion shadow per DESIGN.md modal spec.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Trap focus and handle Escape
  useEffect(() => {
    if (!open) return;

    // Focus confirm button on open
    setTimeout(() => confirmBtnRef.current?.focus(), 50);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      // Basic focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog Card */}
      <div
        ref={dialogRef}
        className="relative bg-surface-container-lowest border border-outline-variant rounded-xl p-6 w-full max-w-sm shadow-[0_8px_40px_rgba(0,0,0,0.12)] animate-fade-in-up"
        style={{ zIndex: 51 }}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-md text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <h2
          id="confirm-dialog-title"
          className="font-headline text-lg font-bold text-on-surface mb-2 pr-6"
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-desc"
          className="font-sans text-sm text-secondary leading-relaxed mb-6"
        >
          {description}
        </p>

        {/* Action buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-outline-variant rounded-lg font-headline text-sm font-semibold text-secondary hover:border-outline hover:text-on-surface hover:bg-surface-container transition-all"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-headline text-sm font-semibold transition-all ${
              variant === 'danger'
                ? 'bg-error text-on-error hover:bg-red-700'
                : 'bg-primary text-on-primary hover:bg-primary-container'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
