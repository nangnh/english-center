"use client";
import { useMemo, useState } from "react";
import type { MatchingQuestion } from "@/types";
import { stableShuffle } from "@/lib/shuffle";
import type { RendererProps } from "./types";

export function MatchingRenderer({
  question,
  draft,
  onDraftChange,
  locked,
  correct,
}: RendererProps<MatchingQuestion>) {
  // Cột trái: từ tiếng Anh (giữ thứ tự gốc). Cột phải: nghĩa Việt (xáo trộn ổn định).
  const rights = useMemo(
    () => stableShuffle(question.pairs, question.id + ":right"),
    [question.pairs, question.id]
  );

  // links: leftPairId -> rightPairId (rightPairId chính là id cặp đúng)
  const links = draft?.kind === "matching" ? draft.links : {};
  const [activeLeft, setActiveLeft] = useState<string | null>(null);

  function setLink(leftId: string, rightId: string) {
    if (locked) return;
    const next: Record<string, string> = { ...links };
    // Bỏ liên kết cũ trỏ tới rightId (một nghĩa chỉ nối một từ).
    for (const k of Object.keys(next)) {
      if (next[k] === rightId) delete next[k];
    }
    next[leftId] = rightId;
    onDraftChange({ kind: "matching", links: next });
    setActiveLeft(null);
  }

  function rightLabelFor(leftId: string): string | null {
    const rid = links[leftId];
    if (!rid) return null;
    const pair = question.pairs.find((p) => p.id === rid);
    return pair ? pair.rightVi : null;
  }

  return (
    <div>
      <p className="mb-3 text-base">
        Bấm một từ tiếng Anh, rồi bấm nghĩa tiếng Việt để nối. Dùng được cả bàn
        phím.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <ul className="flex flex-col gap-3" role="list" aria-label="Từ tiếng Anh">
          {question.pairs.map((p) => {
            const linkedLabel = rightLabelFor(p.id);
            const isActive = activeLeft === p.id;
            const pairCorrect = locked && links[p.id] === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={locked}
                  aria-pressed={isActive}
                  onClick={() => setActiveLeft(isActive ? null : p.id)}
                  className={leftClass(isActive, locked, pairCorrect)}
                >
                  <span className="font-bold">{p.leftEn}</span>
                  {linkedLabel && (
                    <span className="mt-1 block text-sm text-garden-soil">
                      → {linkedLabel}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <ul className="flex flex-col gap-3" role="list" aria-label="Nghĩa tiếng Việt">
          {rights.map((p) => {
            const usedBy = Object.keys(links).find((k) => links[k] === p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={locked || activeLeft === null}
                  onClick={() => activeLeft && setLink(activeLeft, p.id)}
                  className={rightClass(Boolean(usedBy), activeLeft !== null && !locked)}
                >
                  {p.rightVi}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {locked && (
        <p className="mt-3 text-base font-semibold" aria-live="polite">
          {correct ? "Nối đúng cả 3 cặp! 🌟" : "Chưa đủ 3 cặp đúng."}
        </p>
      )}
    </div>
  );
}

function leftClass(active: boolean, locked: boolean, pairCorrect: boolean): string {
  const base =
    "w-full min-h-[44px] rounded-bubble border-2 px-4 py-3 text-left text-lg transition-colors";
  if (locked)
    return `${base} ${
      pairCorrect
        ? "border-garden-leaf bg-garden-grass/30"
        : "border-garden-petal bg-garden-petal/20"
    }`;
  if (active) return `${base} border-garden-leaf bg-garden-sky`;
  return `${base} border-gray-300 bg-white hover:bg-garden-sky`;
}

function rightClass(used: boolean, selectable: boolean): string {
  const base =
    "w-full min-h-[44px] rounded-bubble border-2 px-4 py-3 text-lg transition-colors";
  if (used) return `${base} border-garden-grass bg-garden-grass/20`;
  if (selectable) return `${base} border-garden-leaf bg-white hover:bg-garden-sky`;
  return `${base} border-gray-300 bg-white`;
}
