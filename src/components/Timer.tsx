"use client";

interface TimerProps {
  seconds: number; // số giây còn lại; Infinity = không giới hạn
}

export function Timer({ seconds }: TimerProps) {
  if (!Number.isFinite(seconds)) {
    return (
      <span className="rounded-bubble bg-white px-3 py-1 text-base font-bold">
        ⏱️ Không giới hạn
      </span>
    );
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const low = seconds <= 60;
  return (
    <span
      className={`rounded-bubble px-3 py-1 text-base font-bold ${
        low ? "bg-garden-petal/30 text-garden-ink" : "bg-white"
      }`}
      aria-label={`Còn lại ${m} phút ${s} giây`}
    >
      ⏱️ {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}
