"use client";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Answer, Attempt } from "@/types";
import { getQuestion } from "@/data";
import {
  engineReducer,
  remainingSeconds,
  totalScore,
  isExpired,
  currentStage,
  STAGE_SIZE,
} from "@/lib/engine";
import {
  buildAttempt,
  nextRoundIdOf,
  resolvePlayParam,
  type ResolvedPlay,
} from "@/lib/session";
import { useProgress } from "@/components/useProgress";
import {
  finalizeRoundAttempt,
  upsertAttempt,
  setActiveAttempt,
} from "@/lib/storage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Timer } from "@/components/Timer";
import { QuestionRenderer } from "@/components/QuestionRenderer";
import { Confetti } from "@/components/Confetti";
import { useSettings } from "@/components/useSettings";
import { getBrowserSpeechEnv, speak, cancelSpeech } from "@/lib/speech";
import { autoSpeakText } from "@/lib/keyword";
import { playCorrectSound, playWrongSound, pickEncouragement } from "@/lib/sound";

interface PlayClientProps {
  param: string;
}

export function PlayClient({ param }: PlayClientProps) {
  const router = useRouter();
  const { ready, progress, update } = useProgress();
  const { soundOn, toggleSound } = useSettings();
  const resolved: ResolvedPlay | null = useMemo(
    () => resolvePlayParam(param),
    [param]
  );

  const [attempt, dispatch] = useReducer(
    (state: Attempt | null, action: Parameters<typeof engineReducer>[1] | { type: "SET"; attempt: Attempt }) => {
      if (action.type === "SET") return action.attempt;
      if (!state) return state;
      return engineReducer(state, action);
    },
    null
  );

  const [draft, setDraft] = useState<Answer | undefined>(undefined);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const persistedRef = useRef(false);
  const [confetti, setConfetti] = useState(false);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const inputFocusRef = useRef<HTMLDivElement | null>(null);

  // Khởi tạo lượt sau khi tiến bộ sẵn sàng (resume nếu còn lượt vòng dở).
  useEffect(() => {
    if (!ready || !resolved || attempt) return;
    const existing =
      resolved.mode === "round" && progress.activeAttemptId
        ? progress.attempts.find(
            (a) =>
              a.id === progress.activeAttemptId &&
              a.roundId === resolved.roundId &&
              a.status === "playing"
          )
        : undefined;
    const now = Date.now();
    if (existing) {
      // Resume: nếu đã hết hạn thì kết thúc ngay một lần.
      const resumed = isExpired(existing, now)
        ? engineReducer(existing, { type: "TICK", nowMs: now })
        : existing;
      dispatch({ type: "SET", attempt: resumed });
    } else {
      const fresh = buildAttempt(resolved, now);
      dispatch({ type: "SET", attempt: fresh });
      // Đăng ký là lượt đang hoạt động (chỉ chế độ vòng).
      if (fresh.mode === "round") {
        update(setActiveAttempt(upsertAttempt(progress, fresh), fresh.id));
      }
    }
  }, [ready, resolved, attempt, progress, update]);

  // Đồng hồ tick mỗi giây cho chế độ vòng.
  useEffect(() => {
    if (!attempt || attempt.mode !== "round" || attempt.status !== "playing") {
      return;
    }
    const t = setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      dispatch({ type: "TICK", nowMs: now });
    }, 1000);
    return () => clearInterval(t);
  }, [attempt]);

  // Kiểm tra lại khi tab hiển thị trở lại.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        setNowMs(now);
        dispatch({ type: "TICK", nowMs: now });
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Cảnh báo trước khi rời trang khi đang làm bài vòng.
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (attempt && attempt.mode === "round" && attempt.status === "playing") {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [attempt]);

  // Khi lượt kết thúc: lưu kết quả + cập nhật best/unlock đúng một lần.
  useEffect(() => {
    if (!attempt || attempt.status !== "finished" || persistedRef.current) {
      return;
    }
    persistedRef.current = true;
    if (attempt.mode === "round" && attempt.roundId) {
      const nextId = nextRoundIdOf(attempt.roundId);
      update(finalizeRoundAttempt(progress, attempt, nextId));
    } else {
      update(setActiveAttempt(upsertAttempt(progress, attempt), null));
    }
    router.push(`/results/${attempt.id}`);
  }, [attempt, progress, update, router]);

  const current = attempt
    ? getQuestion(attempt.questionIds[attempt.currentIndex])
    : undefined;
  const isSubmitted = Boolean(
    attempt && current && attempt.evaluationsById[current.id]
  );
  const evaluation =
    attempt && current ? attempt.evaluationsById[current.id] : undefined;
  const audioFallback = Boolean(
    attempt && current && attempt.audioFallbackIds.includes(current.id)
  );

  const currentId = current?.id;

  // Khi câu mới hiển thị (chưa nộp): tự phát từ khóa (trừ listening) và
  // auto-focus ô nhập nếu có. Reset hiệu ứng/lời động viên.
  useEffect(() => {
    if (!current || isSubmitted) return;
    setConfetti(false);
    setEncouragement(null);

    // Auto-focus ô nhập đầu tiên (fill/spell-fill) không gây giật bố cục.
    const node = inputFocusRef.current?.querySelector<HTMLInputElement>(
      "input[type='text']"
    );
    if (node) {
      try {
        node.focus({ preventScroll: true });
      } catch {
        node.focus();
      }
    }

    // Tự phát từ khóa tiếng Anh (trừ listening); trình duyệt có thể chặn.
    if (soundOn) {
      const text = autoSpeakText(current);
      if (text) {
        const env = getBrowserSpeechEnv();
        speak(env, text); // nếu bị chặn/không có giọng -> im lặng, không lỗi
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  // Hủy phát khi rời trang.
  useEffect(() => {
    return () => cancelSpeech(getBrowserSpeechEnv());
  }, []);

  const persistPlaying = useCallback(
    (next: Attempt) => {
      if (next.mode === "round") {
        update(upsertAttempt(progress, next));
      }
    },
    [progress, update]
  );

  const handleSubmit = useCallback(() => {
    if (!attempt || !current || !draft) return;
    const next = engineReducer(attempt, {
      type: "SUBMIT_ANSWER",
      questionId: current.id,
      answer: draft,
      question: current,
    });
    dispatch({ type: "SET", attempt: next });
    persistPlaying(next);

    // Phản hồi tương tác sau khi chấm.
    const result = next.evaluationsById[current.id];
    if (result?.correct) {
      setConfetti(true);
      setEncouragement(null);
      if (soundOn) playCorrectSound();
    } else {
      setConfetti(false);
      setEncouragement(pickEncouragement(current.id.length + attempt.currentIndex));
      if (soundOn) playWrongSound();
    }
  }, [attempt, current, draft, persistPlaying, soundOn]);

  const handleNext = useCallback(() => {
    if (!attempt) return;
    const isLast = attempt.currentIndex >= attempt.questionIds.length - 1;
    if (isLast) {
      const finished = engineReducer(attempt, {
        type: "FINISH",
        nowMs: Date.now(),
      });
      dispatch({ type: "SET", attempt: finished });
      return;
    }
    const next = engineReducer(attempt, { type: "NEXT" });
    dispatch({ type: "SET", attempt: next });
    persistPlaying(next);
    setDraft(undefined);
  }, [attempt, persistPlaying]);

  const handleUseFallback = useCallback(() => {
    if (!attempt || !current) return;
    const next = engineReducer(attempt, {
      type: "USE_AUDIO_FALLBACK",
      questionId: current.id,
    });
    dispatch({ type: "SET", attempt: next });
    persistPlaying(next);
  }, [attempt, current, persistPlaying]);

  const handleExit = useCallback(() => {
    const ok =
      attempt && attempt.mode === "round" && attempt.status === "playing"
        ? window.confirm(
            "Bạn đang làm bài. Thoát ra sẽ tạm dừng lượt này. Bạn có chắc không?"
          )
        : true;
    if (ok) router.push(attempt?.mode === "round" ? "/rounds" : "/topics");
  }, [attempt, router]);

  if (!resolved) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <p className="text-lg">Không tìm thấy bài này.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Về trang chủ
          </Button>
        </Card>
      </main>
    );
  }

  if (!attempt || !current) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8" aria-live="polite">
        <p>Đang chuẩn bị bài…</p>
      </main>
    );
  }

  const remaining = remainingSeconds(attempt, nowMs);
  const index = attempt.currentIndex;
  const totalQ = attempt.questionIds.length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Confetti show={confetti} />
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={handleExit} aria-label="Thoát bài">
          ← Thoát
        </Button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? "Tắt âm thanh" : "Bật âm thanh"}
            title={soundOn ? "Tắt âm thanh" : "Bật âm thanh"}
            className="min-h-[44px] min-w-[44px] rounded-bubble bg-white px-3 py-1 text-xl"
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
          <span className="rounded-bubble bg-white px-3 py-1 text-base font-bold">
            ⭐ {totalScore(attempt)}
          </span>
          {attempt.mode === "round" && <Timer seconds={remaining} />}
        </div>
      </div>

      <div className="mb-4">
        <ProgressBar
          value={index + 1}
          max={totalQ}
          label={`Câu ${index + 1}/${totalQ}${
            attempt.mode === "round"
              ? ` · Chặng ${currentStage(attempt) + 1}/${totalQ / STAGE_SIZE}`
              : ""
          }`}
        />
      </div>

      <Card>
        <h1 className="mb-3 text-xl font-bold text-garden-leaf">
          {current.promptVi}
        </h1>
        <div ref={inputFocusRef}>
          <QuestionRenderer
            question={current}
            draft={draft}
            onDraftChange={setDraft}
            locked={isSubmitted}
            correct={evaluation?.correct}
            audioFallback={audioFallback}
            onUseFallback={handleUseFallback}
          />
        </div>

        {isSubmitted && (
          <div
            className={`mt-4 rounded-bubble p-3 ${
              evaluation?.correct
                ? "bg-garden-grass/30"
                : "bg-garden-sun/30"
            }`}
            aria-live="polite"
          >
            <p className="text-lg font-bold">
              {evaluation?.correct ? "Tuyệt vời! 🌟" : "Cùng xem lại nhé 🌼"}
            </p>
            {!evaluation?.correct && encouragement && (
              <p className="mt-1 text-base font-semibold text-garden-leaf">
                {encouragement}
              </p>
            )}
            <p className="mt-1 text-base">{current.explanationVi}</p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          {!isSubmitted ? (
            <Button onClick={handleSubmit} disabled={!draft}>
              Kiểm tra
            </Button>
          ) : (
            <Button onClick={handleNext}>
              {index >= totalQ - 1 ? "Xem kết quả" : "Tiếp theo →"}
            </Button>
          )}
        </div>
      </Card>
    </main>
  );
}
