// Âm thanh phản hồi tổng hợp bằng Web Audio API (không tải file ngoài).
// Suy biến an toàn khi AudioContext không khả dụng.

// Câu động viên dùng nguồn chung (single source of truth) ở encouragements.ts.
// Re-export pickEncouragement để các importer cũ của sound.ts vẫn hoạt động.
export { pickEncouragement } from "./encouragements";

type AudioCtor = typeof AudioContext;

function getAudioContextCtor(): AudioCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: AudioCtor;
    webkitAudioContext?: AudioCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

let ctx: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  try {
    if (!ctx) ctx = new Ctor();
    // Một số trình duyệt mở context ở trạng thái suspended tới khi có gesture.
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Phát một chuỗi nốt đơn giản. Không ném lỗi nếu audio không khả dụng. */
function playTones(
  notes: Array<{ freq: number; start: number; duration: number }>,
  type: OscillatorType = "sine"
): void {
  const audio = ensureContext();
  if (!audio) return;
  try {
    const now = audio.currentTime;
    for (const n of notes) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.value = n.freq;
      // Bao hình âm lượng nhẹ để không chói.
      const t0 = now + n.start;
      const t1 = t0 + n.duration;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t1);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(t0);
      osc.stop(t1 + 0.02);
    }
  } catch {
    // bỏ qua
  }
}

/** Âm chúc mừng vui tươi: chuỗi nốt đi lên (C-E-G-C). */
export function playCorrectSound(): void {
  playTones(
    [
      { freq: 523.25, start: 0, duration: 0.12 }, // C5
      { freq: 659.25, start: 0.1, duration: 0.12 }, // E5
      { freq: 783.99, start: 0.2, duration: 0.12 }, // G5
      { freq: 1046.5, start: 0.3, duration: 0.2 }, // C6
    ],
    "triangle"
  );
}

/** Âm báo sai nhẹ nhàng: một nốt trầm ngắn (không chói, không gắt). */
export function playWrongSound(): void {
  playTones(
    [
      { freq: 311.13, start: 0, duration: 0.18 }, // Eb4
      { freq: 246.94, start: 0.14, duration: 0.22 }, // B3
    ],
    "sine"
  );
}
