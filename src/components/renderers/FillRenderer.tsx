"use client";
import type { FillQuestion } from "@/types";
import type { RendererProps } from "./types";

export function FillRenderer({
  question,
  draft,
  onDraftChange,
  locked,
}: RendererProps<FillQuestion>) {
  const value = draft?.kind === "fill" ? draft.text : "";
  return (
    <div>
      <p className="mb-3 text-lg font-semibold">{question.questionEn}</p>
      <label className="block">
        <span className="mb-1 block text-base">Gõ từ tiếng Anh:</span>
        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={locked}
          value={value}
          onChange={(e) => onDraftChange({ kind: "fill", text: e.target.value })}
          className="w-full min-h-[48px] rounded-bubble border-2 border-garden-leaf px-4 py-3 text-xl"
          placeholder="Ví dụ: cat"
          aria-label="Ô nhập từ tiếng Anh"
        />
      </label>
      <p className="mt-2 text-sm text-garden-soil">
        Không cần viết hoa. Khoảng trắng thừa sẽ được bỏ qua.
      </p>
    </div>
  );
}
