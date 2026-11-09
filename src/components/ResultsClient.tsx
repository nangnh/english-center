"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProgress } from "@/components/useProgress";
import { getQuestion } from "@/data";
import { totalScore, MAX_ROUND_SCORE, isPass } from "@/lib/engine";
import { nextRoundIdOf } from "@/lib/session";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m} phút ${s} giây`;
}

export function ResultsClient({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const { ready, progress } = useProgress();

  if (!ready) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8" aria-live="polite">
        <p>Đang tải kết quả…</p>
      </main>
    );
  }

  const attempt = progress.attempts.find((a) => a.id === attemptId);
  if (!attempt) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card>
          <p className="text-lg">Không tìm thấy kết quả này.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Về trang chủ
          </Button>
        </Card>
      </main>
    );
  }

  const score = totalScore(attempt);
  const correctCount = Object.values(attempt.evaluationsById).filter(
    (e) => e.correct
  ).length;
  const total = attempt.questionIds.length;
  const durationMs =
    (attempt.endedAtMs ?? attempt.startedAtMs) - attempt.startedAtMs;
  const passed = isPass(attempt);
  const nextId = attempt.roundId ? nextRoundIdOf(attempt.roundId) : undefined;

  const retryHref =
    attempt.mode === "round"
      ? `/play/?round=${attempt.roundId}`
      : attempt.topic
      ? `/play/?round=quick-${attempt.topic}`
      : "/topics";

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Card className="text-center">
        <h1 className="text-3xl font-extrabold text-garden-leaf">
          {attempt.mode === "round" ? "Kết quả vòng" : "Kết quả luyện nhanh"}
        </h1>
        <p className="mt-3 text-5xl font-extrabold">
          {score}
          {attempt.mode === "round" && (
            <span className="text-2xl text-garden-soil">/{MAX_ROUND_SCORE}</span>
          )}
        </p>
        <p className="mt-2 text-lg">
          Đúng {correctCount}/{total} câu · {formatDuration(durationMs)}
        </p>
        {attempt.mode === "round" && (
          <p
            className={`mt-2 text-lg font-bold ${
              passed ? "text-garden-leaf" : "text-garden-soil"
            }`}
            aria-live="polite"
          >
            {passed
              ? nextId
                ? "Tuyệt vời! Bạn đã mở khóa vòng tiếp theo 🎉"
                : "Tuyệt vời! Bạn đã hoàn thành vòng cuối 🌟"
              : "Chưa đạt 150 điểm. Luyện lại để mở vòng sau nhé!"}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href={retryHref}>
            <Button>Luyện lại</Button>
          </Link>
          {attempt.mode === "round" && passed && nextId && (
            <Link href={`/play/?round=${nextId}`}>
              <Button variant="secondary">Vòng tiếp theo</Button>
            </Link>
          )}
          <Link href="/progress">
            <Button variant="secondary">Xem tiến bộ</Button>
          </Link>
          <Link href="/">
            <Button variant="ghost">Trang chủ</Button>
          </Link>
        </div>
      </Card>

      <h2 className="mt-8 text-xl font-bold">Xem lại từng câu</h2>
      <ol className="mt-3 space-y-3">
        {attempt.questionIds.map((qid, i) => {
          const q = getQuestion(qid);
          const evalRes = attempt.evaluationsById[qid];
          if (!q) return null;
          const answered = Boolean(evalRes);
          const correct = evalRes?.correct ?? false;
          return (
            <li key={qid}>
              <Card
                className={
                  correct
                    ? "border-l-4 border-garden-leaf"
                    : "border-l-4 border-garden-sun"
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold">Câu {i + 1}</span>
                  <span className="text-base">
                    {!answered ? "Bỏ trống" : correct ? "Đúng ✅" : "Sai 🌼"}
                  </span>
                </div>
                <p className="mt-1 text-base">{q.promptVi}</p>
                <p className="mt-1 text-base text-garden-soil">
                  {q.explanationVi}
                </p>
              </Card>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
