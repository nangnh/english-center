"use client";
import type { Answer, Question } from "@/types";
import { ChoiceRenderer } from "./renderers/ChoiceRenderer";
import { PictureChoiceRenderer } from "./renderers/PictureChoiceRenderer";
import { FillRenderer } from "./renderers/FillRenderer";
import { ListeningRenderer } from "./renderers/ListeningRenderer";
import { MatchingRenderer } from "./renderers/MatchingRenderer";
import { SpellFillRenderer } from "./renderers/SpellFillRenderer";
import { UnscrambleRenderer } from "./renderers/UnscrambleRenderer";

interface QuestionRendererProps {
  question: Question;
  draft: Answer | undefined;
  onDraftChange: (answer: Answer) => void;
  locked: boolean;
  correct?: boolean;
  audioFallback: boolean;
  onUseFallback: () => void;
}

export function QuestionRenderer({
  question,
  draft,
  onDraftChange,
  locked,
  correct,
  audioFallback,
  onUseFallback,
}: QuestionRendererProps) {
  switch (question.kind) {
    case "choice":
      return (
        <ChoiceRenderer
          question={question}
          draft={draft}
          onDraftChange={onDraftChange}
          locked={locked}
          correct={correct}
        />
      );
    case "picture-choice":
      return (
        <PictureChoiceRenderer
          question={question}
          draft={draft}
          onDraftChange={onDraftChange}
          locked={locked}
          correct={correct}
        />
      );
    case "fill":
      return (
        <FillRenderer
          question={question}
          draft={draft}
          onDraftChange={onDraftChange}
          locked={locked}
          correct={correct}
        />
      );
    case "matching":
      return (
        <MatchingRenderer
          question={question}
          draft={draft}
          onDraftChange={onDraftChange}
          locked={locked}
          correct={correct}
        />
      );
    case "listening-choice":
      return (
        <ListeningRenderer
          question={question}
          draft={draft}
          onDraftChange={onDraftChange}
          locked={locked}
          correct={correct}
          audioFallback={audioFallback}
          onUseFallback={onUseFallback}
        />
      );
    case "spell-fill":
      return (
        <SpellFillRenderer
          question={question}
          draft={draft}
          onDraftChange={onDraftChange}
          locked={locked}
          correct={correct}
        />
      );
    case "unscramble":
      return (
        <UnscrambleRenderer
          question={question}
          draft={draft}
          onDraftChange={onDraftChange}
          locked={locked}
          correct={correct}
        />
      );
    default: {
      const _exhaustive: never = question;
      void _exhaustive;
      return null;
    }
  }
}
