import React from 'react';

export interface Crumb {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  crumbs: Crumb[];
}

/**
 * Standardised breadcrumb bar in "SECTION / PAGE" uppercase format.
 * Positioned above the page title, e.g. "DATABASE / PROJECTS"
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ crumbs }) => {
  const formattedCrumbs = crumbs.map((c, i) => {
    const label = c.label.toUpperCase();
    if (label === 'NPMS') {
      const nextLabel = crumbs[i + 1]?.label.toUpperCase();
      if (nextLabel === 'ADMINISTRATION') return 'SYSTEM';
      return 'DATABASE';
    }
    return label;
  });

  return (
    <nav aria-label="Breadcrumb" className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-1">
      {formattedCrumbs.join(' / ')}
    </nav>
  );
};
