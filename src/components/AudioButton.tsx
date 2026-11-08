"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  cancelSpeech,
  getBrowserSpeechEnv,
  hasEnglishVoice,
  speak,
  type SpeechEnv,
} from "@/lib/speech";

interface AudioButtonProps {
  text: string;
  // Gọi khi phát hiện không phát được -> trang cho phép chuyển sang câu đọc.
  onUnavailable?: () => void;
  label?: string;
}

export function AudioButton({ text, onUnavailable, label }: AudioButtonProps) {
  const envRef = useRef<SpeechEnv | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const env = getBrowserSpeechEnv();
    envRef.current = env;

    const check = () => setAvailable(hasEnglishVoice(env));
    check();
    // voiceschanged: danh sách giọng có thể nạp sau.
    if (env.synth && "onvoiceschanged" in env.synth) {
      env.synth.addEventListener?.("voiceschanged", check);
    }
    return () => {
      if (env.synth && "onvoiceschanged" in env.synth) {
        env.synth.removeEventListener?.("voiceschanged", check);
      }
      cancelSpeech(env); // hủy khi unmount
    };
  }, []);

  const handlePlay = useCallback(() => {
    const env = envRef.current;
    if (!env) return;
    const result = speak(env, text);
    if (result !== "spoken") {
      setAvailable(false);
      onUnavailable?.();
    }
  }, [text, onUnavailable]);

  if (available === false) {
    return (
      <p className="text-base text-garden-soil" role="status">
        Không phát được giọng tiếng Anh trên thiết bị này.
      </p>
    );
  }

  return (
    <Button type="button" variant="secondary" onClick={handlePlay}>
      🔊 {label ?? "Nghe"}
    </Button>
  );
}
