"use client";
import { useEffect, useState } from "react";

// Hiệu ứng tung hoa tự vẽ bằng SVG/CSS. aria-hidden, tự ẩn, tôn trọng
// prefers-reduced-motion (khi bật thì không hiển thị hiệu ứng động).

const COLORS = ["#57c977", "#ffcf3f", "#ff7aa8", "#5aa9e6", "#ff914d"];

interface ConfettiProps {
  show: boolean;
  durationMs?: number;
}

export function Confetti({ show, durationMs = 1500 }: ConfettiProps) {
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(t);
  }, [show, durationMs]);

  if (!visible || reduced) return null;

  const pieces = Array.from({ length: 28 }, (_, i) => i);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      data-testid="confetti"
    >
      {pieces.map((i) => {
        const left = (i * 37) % 100;
        const delay = (i % 7) * 60;
        const color = COLORS[i % COLORS.length];
        const size = 8 + (i % 3) * 4;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: "-5%",
              width: size,
              height: size,
              backgroundColor: color,
              borderRadius: i % 2 === 0 ? "50%" : "2px",
              animation: `eg-fall ${durationMs}ms ${delay}ms ease-in forwards`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes eg-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(540deg); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
