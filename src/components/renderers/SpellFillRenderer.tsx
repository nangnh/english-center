"use client";
import { useMemo } from "react";
import type { SpellFillQuestion } from "@/types";
import { maskedWord } from "@/lib/letters";
import type { RendererProps } from "./types";

export function SpellFillRenderer({
  question,
  draft,
  onDraftChange,
  locked,
}: RendererProps<SpellFillQuestion>) {
  const cells = useMemo(
    () => maskedWord(question.answerEn, question.blankIndexes),
    [question.answerEn, question.blankIndexes]
  );
  const letters = draft?.kind === "spell-fill" ? draft.letters : {};

  function setLetter(idx: number, value: string) {
    if (locked) return;
    const ch = value.slice(-1); // chỉ giữ ký tự cuối
    const next: Record<number, string> = { ...letters, [idx]: ch };
    onDraftChange({ kind: "spell-fill", letters: next });
  }

  return (
    <div>
      <p className="mb-3 text-base">
        Gõ chữ cái còn thiếu vào các ô trống.
      </p>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Các chữ cái của từ">
        {cells.map((ch, idx) =>
          ch === null ? (
            <input
              key={idx}
              type="text"
              inputMode="text"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              disabled={locked}
              maxLength={1}
              value={letters[idx] ?? ""}
              onChange={(e) => setLetter(idx, e.target.value)}
              aria-label={`Chữ cái vị trí ${idx + 1}`}
              className="h-14 w-12 rounded-bubble border-2 border-garden-leaf text-center text-2xl font-bold uppercase"
            />
          ) : (
            <span
              key={idx}
              aria-hidden
              className="flex h-14 w-12 items-center justify-center rounded-bubble bg-garden-sky text-2xl font-bold uppercase"
            >
              {ch}
            </span>
          )
        )}
      </div>
      <p className="mt-2 text-sm text-garden-soil">
        Không cần viết hoa.
      </p>
    </div>
  );
}
