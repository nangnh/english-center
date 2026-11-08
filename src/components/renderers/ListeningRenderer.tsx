"use client";
import { useMemo } from "react";
import type { ListeningChoiceQuestion } from "@/types";
import { stableShuffle } from "@/lib/shuffle";
import { AudioButton } from "@/components/AudioButton";
import { optionClass } from "./ChoiceRenderer";
import type { RendererProps } from "./types";

interface ListeningProps extends RendererProps<ListeningChoiceQuestion> {
  onUseFallback: () => void;
}

export function ListeningRenderer({
  question,
  draft,
  onDraftChange,
  locked,
  audioFallback,
  onUseFallback,
}: ListeningProps) {
  const options = useMemo(
    () => stableShuffle(question.options, question.id),
    [question.options, question.id]
  );
  const selected =
    draft?.kind === "listening-choice" ? draft.optionId : undefined;

  return (
    <div>
      {audioFallback ? (
        // Chế độ đọc thay thế: hiện đề đọc, KHÔNG phải bài nghe.
        <div className="mb-3 rounded-bubble bg-garden-sky/60 p-3">
          <p className="text-base font-semibold">
            {question.readingFallback.promptVi}
          </p>
          <p className="mt-1 text-2xl font-bold">
            {question.readingFallback.questionEn}
          </p>
          <p className="mt-1 text-sm text-garden-soil">
            (Đây là bài đọc thay thế, không phải bài nghe.)
          </p>
        </div>
      ) : (
        // Chế độ nghe: KHÔNG hiển thị transcript làm lộ đáp án.
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <AudioButton
            text={question.speechTextEn}
            onUnavailable={onUseFallback}
          />
          {!locked && (
            <button
              type="button"
              onClick={onUseFallback}
              className="text-base text-garden-leaf underline"
            >
              Không nghe được? Dùng bài đọc thay thế
            </button>
          )}
        </div>
      )}

      <p className="mb-2 text-base">Chọn nghĩa tiếng Việt đúng:</p>
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
                onClick={() =>
                  onDraftChange({ kind: "listening-choice", optionId: o.id })
                }
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
