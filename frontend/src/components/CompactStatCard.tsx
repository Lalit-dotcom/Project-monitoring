import React from 'react';
import { useCountUp } from '../hooks/useCountUp';

interface CompactStatCardProps {
  label: string;
  value: number;
  bg: string;
  labelColor: string;
  numColor: string;
  icon?: React.ReactNode;
  sub?: React.ReactNode;
  loading?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  tabIndex?: number;
  children?: React.ReactNode;
  format?: (val: number) => string | number;
  className?: string;
}

export const CompactStatCard: React.FC<CompactStatCardProps> = ({
  label,
  value,
  bg,
  labelColor,
  numColor,
  icon,
  sub,
  loading,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  tabIndex,
  children,
  format,
  className,
}) => {
  const animatedValue = useCountUp(value);
  const displayValue = format ? format(animatedValue) : animatedValue;

  if (loading) {
    return (
      <div
        style={{ backgroundColor: bg }}
        className="animate-pulse rounded-[12px] p-[12px] flex flex-col justify-between h-[88px] min-w-[160px] sm:min-w-[180px] flex-initial"
      >
        <div className="h-3.5 bg-black/10 rounded w-24"></div>
        <div className="h-7 bg-black/15 rounded w-12"></div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={tabIndex}
      style={{ backgroundColor: bg }}
      className={`rounded-[12px] p-[12px] flex flex-col justify-between relative select-none transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      } ${className || 'h-[88px] min-w-[160px] sm:min-w-[180px] flex-initial'}`}
    >
      <div className="flex justify-between items-start">
        <span
          style={{ color: labelColor }}
          className="font-headline text-[11px] font-semibold uppercase tracking-[0.04em] block mb-[10px] leading-tight"
        >
          {label}
        </span>
        {icon && <div style={{ color: labelColor }} className="shrink-0">{icon}</div>}
      </div>

      <div
        style={{ color: numColor }}
        className="font-headline text-[26px] font-medium leading-none dont-translate bhashini-skip-translation"
      >
        {displayValue}
      </div>

      {sub && (
        <div style={{ color: labelColor }} className="text-[11px] opacity-75 mt-1 font-sans">
          {sub}
        </div>
      )}

      {children}
    </div>
  );
};
