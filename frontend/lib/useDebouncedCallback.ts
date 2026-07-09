/**
 * `useDebouncedCallback` — a debounced wrapper around `callback`.
 *
 * Returns a stable controller `{ call, flush, cancel }`:
 *  - `call(...args)` schedules `callback` after `delay`, resetting the timer and
 *    remembering the latest args.
 *  - `flush()` runs any pending call immediately (used when the editor closes).
 *  - `cancel()` drops any pending call.
 *
 * The controller object is created once (via `useRef`) so it is referentially
 * stable, and it always invokes the freshest `callback` through a ref. This
 * avoids attaching properties to a memoized function (which the React Compiler
 * lint rules disallow).
 */
'use client';

import { useEffect, useMemo, useRef } from 'react';

export interface DebounceController<A extends unknown[]> {
  call: (...args: A) => void;
  flush: () => void;
  cancel: () => void;
}

export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
): DebounceController<A> {
  const callbackRef = useRef(callback);
  const delayRef = useRef(delay);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<A | null>(null);

  // Keep refs pointing at the freshest values without recreating the controller.
  useEffect(() => {
    callbackRef.current = callback;
    delayRef.current = delay;
  }, [callback, delay]);

  // Build the controller once. It closes over stable refs, so empty deps are
  // correct and the object identity never changes across renders.
  const controller = useMemo<DebounceController<A>>(() => {
    const clear = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    return {
      call: (...args: A) => {
        lastArgsRef.current = args;
        clear();
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          const nextArgs = lastArgsRef.current;
          lastArgsRef.current = null;
          if (nextArgs) callbackRef.current(...nextArgs);
        }, delayRef.current);
      },
      flush: () => {
        if (timerRef.current && lastArgsRef.current) {
          clear();
          const nextArgs = lastArgsRef.current;
          lastArgsRef.current = null;
          callbackRef.current(...nextArgs);
        }
      },
      cancel: () => {
        clear();
        lastArgsRef.current = null;
      },
    };
  }, []);

  // Cancel any pending timer on unmount.
  useEffect(() => controller.cancel, [controller]);

  return controller;
}
