"use client";
import { useCallback, useEffect, useState } from "react";

export const SOUND_KEY = "english-garden:sound-on:v1";

function readSoundPref(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(SOUND_KEY);
    return raw === null ? true : raw === "1"; // mặc định bật
  } catch {
    return true;
  }
}

export interface UseSettings {
  ready: boolean;
  soundOn: boolean;
  toggleSound: () => void;
}

export function useSettings(): UseSettings {
  const [ready, setReady] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(readSoundPref());
    setReady(true);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SOUND_KEY, next ? "1" : "0");
      } catch {
        // bỏ qua nếu storage bị chặn
      }
      return next;
    });
  }, []);

  return { ready, soundOn, toggleSound };
}
