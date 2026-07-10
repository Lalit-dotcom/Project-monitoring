import { useState, useEffect, useRef } from 'react';

/**
 * Lightweight requestAnimationFrame-based count-up hook.
 * Animates from 0 → target over `duration` ms on mount and whenever target changes.
 * Respects prefers-reduced-motion: returns target immediately when motion is reduced.
 */
export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0);
  const prefersReduced = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (prefersReduced.current) {
      setValue(target);
      return;
    }

    if (target === 0) {
      setValue(0);
      return;
    }

    let start: number | null = null;
    const from = 0;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
