import React from 'react';
import { Inbox, SearchX } from 'lucide-react';

interface EmptyStateProps {
  /** True when zero results are caused by active filters (vs genuinely empty table) */
  isFiltered: boolean;
  /** Page noun used in the message, e.g. "projects", "invoices" */
  entityName?: string;
  /** Called when the "Clear Filters" button is clicked — only rendered when isFiltered=true */
  onClear?: () => void;
}

/**
 * Centered empty-state block for insertion inside a <tbody>.
 * Shows different copy for "filtered empty" vs "genuinely empty" cases.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  isFiltered,
  entityName = 'records',
  onClear,
}) => {
  const Icon = isFiltered ? SearchX : Inbox;
  const title = isFiltered
    ? `No ${entityName} match your filters`
    : `No ${entityName} yet`;
  const description = isFiltered
    ? 'Try adjusting or clearing your search and filter criteria.'
    : `When ${entityName} are added they will appear here.`;

  return (
    <tr>
      <td colSpan={999} className="py-16 px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center">
            <Icon className="w-7 h-7 text-outline" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <p className="font-headline text-base font-bold text-on-surface-variant">
              {title}
            </p>
            <p className="font-sans text-sm text-secondary max-w-xs">
              {description}
            </p>
          </div>
          {isFiltered && onClear && (
            <button
              onClick={onClear}
              className="mt-1 px-4 py-2 border border-outline-variant rounded-lg font-headline text-sm font-semibold text-secondary hover:border-primary hover:text-primary hover:bg-primary/5 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              aria-label="Clear all active filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
