"use client";
import { useMemo } from "react";
import type { PictureChoiceQuestion } from "@/types";
import { stableShuffle } from "@/lib/shuffle";
import type { RendererProps } from "./types";

export function PictureChoiceRenderer({
  question,
  draft,
  onDraftChange,
  locked,
}: RendererProps<PictureChoiceQuestion>) {
  const options = useMemo(
    () => stableShuffle(question.options, question.id),
    [question.options, question.id]
  );
  const selected =
    draft?.kind === "picture-choice" ? draft.optionId : undefined;

  return (
    <div>
      <p className="mb-3 text-lg font-semibold">{question.questionEn}</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="list">
        {options.map((o) => {
          const isSelected = selected === o.id;
          const isCorrect = o.id === question.correctOptionId;
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={locked}
                aria-pressed={isSelected}
                aria-label={o.alt}
                onClick={() =>
                  onDraftChange({ kind: "picture-choice", optionId: o.id })
                }
                className={pictureClass(locked, isSelected, isCorrect)}
              >
                {/* SVG tĩnh trong /public; dùng img để tránh tối ưu hóa SVG. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={o.asset} alt={o.alt} width={96} height={96} className="h-24 w-24" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function pictureClass(
  locked: boolean,
  selected: boolean,
  correct: boolean
): string {
  const base =
    "flex min-h-[44px] w-full items-center justify-center rounded-bubble border-2 p-2 transition-colors";
  if (locked) {
    if (correct) return `${base} border-garden-leaf bg-garden-grass/30`;
    if (selected) return `${base} border-garden-petal bg-garden-petal/20`;
    return `${base} border-gray-300 bg-white opacity-70`;
  }
  if (selected) return `${base} border-garden-leaf bg-garden-sky`;
  return `${base} border-gray-300 bg-white hover:bg-garden-sky`;
}
