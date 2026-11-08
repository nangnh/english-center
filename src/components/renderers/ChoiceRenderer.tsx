"use client";
import { useMemo } from "react";
import type { ChoiceQuestion } from "@/types";
import { stableShuffle } from "@/lib/shuffle";
import type { RendererProps } from "./types";

export function ChoiceRenderer({
  question,
  draft,
  onDraftChange,
  locked,
}: RendererProps<ChoiceQuestion>) {
  const options = useMemo(
    () => stableShuffle(question.options, question.id),
    [question.options, question.id]
  );
  const selected = draft?.kind === "choice" ? draft.optionId : undefined;

  return (
    <div>
      <p className="mb-3 text-lg font-semibold">{question.questionEn}</p>
      <ul className="grid gap-3 sm:grid-cols-2" role="list">
        {options.map((o) => {
          const isSelected = selected === o.id;
          const isCorrect = o.id === question.correctOptionId;
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={locked}
                aria-pressed={isSelected}
                onClick={() => onDraftChange({ kind: "choice", optionId: o.id })}
                className={optionClass(locked, isSelected, isCorrect)}
              >
                {o.textEn}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function optionClass(
  locked: boolean,
  selected: boolean,
  correct: boolean
): string {
  const base =
    "w-full min-h-[44px] rounded-bubble border-2 px-4 py-3 text-lg font-semibold text-left transition-colors";
  if (locked) {
    if (correct) return `${base} border-garden-leaf bg-garden-grass/30`;
    if (selected) return `${base} border-garden-petal bg-garden-petal/20`;
    return `${base} border-gray-300 bg-white opacity-70`;
  }
  if (selected) return `${base} border-garden-leaf bg-garden-sky`;
  return `${base} border-gray-300 bg-white hover:bg-garden-sky`;
}
