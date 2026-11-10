"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  playText,
  stopCurrent,
  type AudioEnv,
  type AudioManifest,
} from "@/lib/audio";
import { getAudioManifest } from "@/lib/audioManifest";
import { cancelSpeech, getBrowserSpeechEnv } from "@/lib/speech";

interface AudioButtonProps {
  text: string;
  // Gọi khi phát hiện không phát được -> trang cho phép chuyển sang câu đọc.
  onUnavailable?: () => void;
  label?: string;
}

// Trạng thái nút theo thiết kế (R6):
//  - idle: sẵn sàng phát.
//  - playing: đang phát (hiển thị chỉ báo + aria-busy — R6.4).
//  - error: phát hỏng sau khi bấm, GIỮ nút kích hoạt lại được (R6.7).
//  - unavailable: cả tệp lẫn Web Speech đều không khả dụng → disable nút,
//    giữ thông báo cố định, gọi onUnavailable (R3.4, R6.6).
type Status = "idle" | "playing" | "error" | "unavailable";

const UNAVAILABLE_MESSAGE =
  "Không phát được giọng tiếng Anh trên thiết bị này.";
const ERROR_MESSAGE = "Không phát được âm thanh. Hãy thử lại.";

export function AudioButton({ text, onUnavailable, label }: AudioButtonProps) {
  // AudioEnv được dựng LAZILY khi người dùng tương tác — KHÔNG tạo
  // HTMLAudioElement nào lúc mở trang (R5.5). Chỉ manifest JSON nhỏ được tải
  // (qua getAudioManifest), không bao giờ preload các tệp .mp3.
  const envRef = useRef<AudioEnv | null>(null);
  const manifestRef = useRef<AudioManifest | null>(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Hủy mọi phát (tệp + Web Speech) khi unmount.
      const env = envRef.current;
      if (env) {
        stopCurrent(env);
        cancelSpeech(env.speechEnv);
      }
    };
  }, []);

  // Dựng AudioEnv một lần, chỉ khi cần (khi người dùng bấm). createAudio chỉ
  // được gọi bên trong playText sau tương tác, nên không có Audio nào tạo ở mount.
  const ensureEnv = useCallback(async (): Promise<AudioEnv> => {
    if (envRef.current) return envRef.current;
    if (!manifestRef.current) {
      manifestRef.current = await getAudioManifest();
    }
    const env: AudioEnv = {
      manifest: manifestRef.current,
      createAudio: (src: string) => new Audio(src),
      speechEnv: getBrowserSpeechEnv(),
      now: () => Date.now(),
    };
    envRef.current = env;
    return env;
  }, []);

  const handlePlay = useCallback(async () => {
    // Giữ <button> gốc (không chặn default) nên Enter/Space kích hoạt tự nhiên (R6.2).
    setStatus("playing");
    try {
      const env = await ensureEnv();
      // playText tự stopCurrent trước khi phát mới (R6.3 — tái kích hoạt khi
      // đang phát sẽ dừng cái cũ và bắt đầu cái mới).
      const outcome = await playText(env, text);
      if (!mountedRef.current) return;
      if (outcome === "unavailable") {
        // Cả tệp lẫn Web Speech đều không được → disable + thông báo cố định (R3.4, R6.6).
        setStatus("unavailable");
        onUnavailable?.();
      } else {
        // played-file | fallback-spoken → về idle (bỏ chỉ báo đang phát).
        setStatus("idle");
      }
    } catch {
      // Lỗi bất ngờ sau khi bấm → error, GIỮ nút kích hoạt lại được (R6.7).
      if (mountedRef.current) setStatus("error");
    }
  }, [text, ensureEnv, onUnavailable]);

  const playing = status === "playing";
  const unavailable = status === "unavailable";

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="secondary"
        onClick={handlePlay}
        disabled={unavailable}
        aria-busy={playing}
        aria-label="Nghe phát âm tiếng Anh"
        className="min-w-11 min-h-11"
      >
        <span aria-hidden="true">{playing ? "🔈" : "🔊"}</span> {label ?? "Nghe"}
      </Button>
      {/* Vùng role="status" luôn hiện diện cho trình đọc màn hình (R6.6, R6.7). */}
      <p className="text-base text-garden-soil" role="status">
        {unavailable
          ? UNAVAILABLE_MESSAGE
          : status === "error"
            ? ERROR_MESSAGE
            : ""}
      </p>
    </div>
  );
}
