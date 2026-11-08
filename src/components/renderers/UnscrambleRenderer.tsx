"use client";
import { useMemo } from "react";
import type { UnscrambleQuestion } from "@/types";
import { buildScrambledTiles } from "@/lib/letters";
import type { RendererProps } from "./types";

export function UnscrambleRenderer({
  question,
  draft,
  onDraftChange,
  locked,
}: RendererProps<UnscrambleQuestion>) {
  const tiles = useMemo(
    () => buildScrambledTiles(question.answerEn, question.id),
    [question.answerEn, question.id]
  );
  const order = draft?.kind === "unscramble" ? draft.order : [];
  const used = new Set(order);
  const byId = new Map(tiles.map((t) => [t.id, t.letter]));

  function addTile(id: string) {
    if (locked || used.has(id)) return;
    onDraftChange({ kind: "unscramble", order: [...order, id] });
  }

  function removeAt(pos: number) {
    if (locked) return;
    const next = order.slice(0, pos).concat(order.slice(pos + 1));
    onDraftChange({ kind: "unscramble", order: next });
  }

  return (
    <div>
      <p className="mb-2 text-base">
        Bấm các chữ cái theo thứ tự để ghép thành từ. Bấm vào ô đã ghép để bỏ ra.
      </p>

      {/* Khu vực từ đang ghép */}
      <div
        className="mb-4 flex min-h-[56px] flex-wrap items-center gap-2 rounded-bubble border-2 border-dashed border-garden-leaf p-2"
        role="list"
        aria-label="Từ đang ghép"
      >
        {order.length === 0 && (
          <span className="text-garden-soil">Chưa có chữ nào.</span>
        )}
        {order.map((id, pos) => (
          <button
            key={`${id}-${pos}`}
            type="button"
            disabled={locked}
            onClick={() => removeAt(pos)}
            aria-label={`Bỏ chữ ${byId.get(id)} khỏi từ`}
            className="flex h-12 w-10 items-center justify-center rounded-bubble bg-garden-grass/30 text-2xl font-bold uppercase"
          >
            {byId.get(id)}
          </button>
        ))}
      </div>

      {/* Các ô chữ cái xáo trộn */}
      <div className="flex flex-wrap gap-2" role="list" aria-label="Chữ cái để chọn">
        {tiles.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={locked || used.has(t.id)}
            onClick={() => addTile(t.id)}
            aria-label={`Thêm chữ ${t.letter}`}
            className={`flex h-14 w-12 items-center justify-center rounded-bubble border-2 text-2xl font-bold uppercase transition-colors ${
              used.has(t.id)
                ? "border-gray-200 bg-gray-100 text-gray-300"
                : "border-garden-leaf bg-white hover:bg-garden-sky"
            }`}
          >
            {t.letter}
          </button>
        ))}
      </div>
    </div>
  );
}
