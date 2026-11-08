import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChoiceRenderer } from "@/components/renderers/ChoiceRenderer";
import { FillRenderer } from "@/components/renderers/FillRenderer";
import { MatchingRenderer } from "@/components/renderers/MatchingRenderer";
import { ListeningRenderer } from "@/components/renderers/ListeningRenderer";
import type {
  ChoiceQuestion,
  FillQuestion,
  MatchingQuestion,
  ListeningChoiceQuestion,
  Answer,
} from "@/types";

const choiceQ: ChoiceQuestion = {
  id: "c1",
  kind: "choice",
  topic: "animals",
  difficulty: 1,
  promptVi: "Chọn từ",
  questionEn: "Choose cat",
  options: [
    { id: "o1", textEn: "cat" },
    { id: "o2", textEn: "dog" },
  ],
  correctOptionId: "o1",
  explanationVi: "cat = mèo",
};

const fillQ: FillQuestion = {
  id: "f1",
  kind: "fill",
  topic: "food",
  difficulty: 1,
  promptVi: "Điền từ",
  questionEn: "táo → ___",
  acceptedAnswers: ["apple"],
  explanationVi: "apple",
};

const matchingQ: MatchingQuestion = {
  id: "m1",
  kind: "matching",
  topic: "animals",
  difficulty: 1,
  promptVi: "Nối",
  pairs: [
    { id: "pair1", leftEn: "cat", rightVi: "mèo" },
    { id: "pair2", leftEn: "dog", rightVi: "chó" },
    { id: "pair3", leftEn: "fish", rightVi: "cá" },
  ],
  explanationVi: "x",
};

const listeningQ: ListeningChoiceQuestion = {
  id: "l1",
  kind: "listening-choice",
  topic: "animals",
  difficulty: 1,
  promptVi: "Nghe",
  speechTextEn: "cat",
  options: [
    { id: "o1", textEn: "mèo" },
    { id: "o2", textEn: "chó" },
  ],
  correctOptionId: "o1",
  readingFallback: { promptVi: "Đọc từ", questionEn: "cat" },
  explanationVi: "x",
};

describe("ChoiceRenderer (R1/R2)", () => {
  it("bấm một lựa chọn gọi onDraftChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChoiceRenderer
        question={choiceQ}
        draft={undefined}
        onDraftChange={onChange}
        locked={false}
      />
    );
    await user.click(screen.getByRole("button", { name: "cat" }));
    expect(onChange).toHaveBeenCalledWith({ kind: "choice", optionId: "o1" });
  });

  it("khi locked thì nút bị vô hiệu", () => {
    render(
      <ChoiceRenderer
        question={choiceQ}
        draft={{ kind: "choice", optionId: "o1" }}
        onDraftChange={vi.fn()}
        locked
      />
    );
    expect(screen.getByRole("button", { name: "cat" })).toBeDisabled();
  });
});

describe("FillRenderer (R1): thân thiện trẻ", () => {
  it("có gợi ý không cần viết hoa và ô nhập dùng được", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FillRenderer
        question={fillQ}
        draft={undefined}
        onDraftChange={onChange}
        locked={false}
      />
    );
    expect(screen.getByText(/Không cần viết hoa/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Ô nhập/i), "a");
    expect(onChange).toHaveBeenCalled();
  });
});

describe("MatchingRenderer (R1): click/keyboard, không kéo thả", () => {
  it("nối bằng cách bấm trái rồi bấm phải", async () => {
    const user = userEvent.setup();
    let draft: Answer | undefined;
    const onChange = vi.fn((a: Answer) => {
      draft = a;
    });
    render(
      <MatchingRenderer
        question={matchingQ}
        draft={undefined}
        onDraftChange={onChange}
        locked={false}
      />
    );
    await user.click(screen.getByRole("button", { name: /cat/i }));
    await user.click(screen.getByRole("button", { name: "mèo" }));
    expect(onChange).toHaveBeenCalled();
    expect(draft?.kind).toBe("matching");
  });

  it("nối được bằng bàn phím (focus + Enter)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MatchingRenderer
        question={matchingQ}
        draft={undefined}
        onDraftChange={onChange}
        locked={false}
      />
    );
    const left = screen.getByRole("button", { name: /dog/i });
    left.focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "chó" }));
    expect(onChange).toHaveBeenCalled();
  });
});

describe("ListeningRenderer (R5): không lộ transcript sớm", () => {
  it("chế độ nghe không hiển thị từ speechTextEn", () => {
    render(
      <ListeningRenderer
        question={listeningQ}
        draft={undefined}
        onDraftChange={vi.fn()}
        locked={false}
        audioFallback={false}
        onUseFallback={vi.fn()}
      />
    );
    // Không có phần tử nào hiển thị "cat" (transcript) khi chưa dùng fallback.
    expect(screen.queryByText("cat")).not.toBeInTheDocument();
    // Có nút chuyển sang bài đọc thay thế.
    expect(screen.getByText(/bài đọc thay thế/i)).toBeInTheDocument();
  });

  it("chế độ fallback hiển thị đề đọc và ghi rõ không phải bài nghe", () => {
    render(
      <ListeningRenderer
        question={listeningQ}
        draft={undefined}
        onDraftChange={vi.fn()}
        locked={false}
        audioFallback
        onUseFallback={vi.fn()}
      />
    );
    expect(screen.getByText("cat")).toBeInTheDocument();
    expect(screen.getByText(/không phải bài nghe/i)).toBeInTheDocument();
  });
});
