"use client";
import { useCallback, useEffect, useState } from "react";
import type { Progress } from "@/types";
import {
  createInitialProgress,
  getLocalStorageSafe,
  loadProgress,
  saveProgress,
  clearAll as clearAllStore,
  type KeyValueStore,
  type StorageMode,
} from "@/lib/storage";

export interface UseProgress {
  ready: boolean; // đã mount & nạp xong (tránh hydration mismatch)
  progress: Progress;
  mode: StorageMode;
  message?: string;
  update: (next: Progress) => void;
  reload: () => void;
  clearAll: () => void;
}

// React 18 không có useCallback import mặc định ở đây; dùng alias an toàn.
function useCallbackSafe<T extends (...args: never[]) => unknown>(fn: T, deps: unknown[]): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(fn, deps);
}

export function useProgress(): UseProgress {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<Progress>(() =>
    createInitialProgress()
  );
  const [mode, setMode] = useState<StorageMode>("persistent");
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [store, setStore] = useState<KeyValueStore | null>(null);

  const doLoad = useCallbackSafe(() => {
    const s = getLocalStorageSafe();
    setStore(s);
    const res = loadProgress(s);
    setProgress(res.progress);
    setMode(res.mode);
    setMessage(res.message);
    setReady(true);
  }, []);

  useEffect(() => {
    doLoad();
  }, [doLoad]);

  const update = useCallbackSafe(
    (next: Progress) => {
      setProgress(next);
      const written = saveProgress(store, next);
      setMode(written);
      if (written === "memory" && store) {
        setMessage(
          "Không lưu được vào bộ nhớ lâu dài. Tiến bộ chỉ giữ tạm trong phiên này."
        );
      }
    },
    [store]
  );

  const clearAll = useCallbackSafe(() => {
    const fresh = clearAllStore(store);
    setProgress(fresh);
  }, [store]);

  return { ready, progress, mode, message, update, reload: doLoad, clearAll };
}
