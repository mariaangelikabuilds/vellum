'use client';
import { useEffect, useMemo, useRef } from 'react';

/**
 * Returns a debounced version of `fn` that only fires after `delay` ms of
 * silence between calls. Stable across renders; cancels in-flight on unmount.
 */
export function useDebounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void | Promise<void>,
  delay: number,
) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useMemo(() => {
    return (...args: TArgs) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delay);
    };
  }, [delay]);
}
