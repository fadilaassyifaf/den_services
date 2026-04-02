/**
 * Path: src/core/hooks/use-polling.ts
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  enabled:    boolean;
  interval?:  number;
  onSuccess?: () => void;
  onError?:   (error: Error) => void;
}

export function usePolling(
  pollFn: () => Promise<boolean>,
  { enabled, interval = 3000, onSuccess, onError }: UsePollingOptions
) {
  const timeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollFnRef    = useRef(pollFn);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef   = useRef(onError);
  const enabledRef   = useRef(enabled);
  const isRunningRef = useRef(false);

  useEffect(() => { pollFnRef.current    = pollFn;    });
  useEffect(() => { onSuccessRef.current = onSuccess; });
  useEffect(() => { onErrorRef.current   = onError;   });
  useEffect(() => { enabledRef.current   = enabled;   });

  const stopPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isRunningRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const scheduleNext = (delay: number) => {
      timeoutRef.current = setTimeout(() => void poll(), delay);
    };

    const poll = async () => {
      if (cancelled || !enabledRef.current || isRunningRef.current) return;
      isRunningRef.current = true;

      try {
        const shouldContinue = await pollFnRef.current();
        if (cancelled) return;

        isRunningRef.current = false;

        if (shouldContinue) {
          scheduleNext(interval);
        } else {
          onSuccessRef.current?.();
        }
      } catch (error) {
        isRunningRef.current = false;
        if (!cancelled) {
          onErrorRef.current?.(error as Error);
          scheduleNext(interval);
        }
      }
    };

    void poll(); // poll pertama langsung

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      isRunningRef.current = false;
    };
  }, [enabled, interval]);

  return { stopPolling };
}