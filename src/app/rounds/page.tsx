"use client";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useProgress } from "@/components/useProgress";
import { ROUNDS } from "@/data";
import { PASS_SCORE, MAX_ROUND_SCORE } from "@/lib/engine";

export default function RoundsPage() {
  const { ready, progress } = useProgress();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-garden-leaf underline">
        ← Về trang chủ
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold text-garden-leaf">
        Vòng luyện 🏆
      </h1>
      <p className="mt-2 text-lg">
        Mỗi vòng có 20 câu trong 30 phút. Đạt {PASS_SCORE}/{MAX_ROUND_SCORE} điểm
        để mở vòng tiếp theo.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {ROUNDS.map((round, i) => {
          const unlocked = ready
            ? progress.unlockedRoundIds.includes(round.id)
            : i === 0;
          const best = progress.bestByRound[round.id];
          return (
            <li key={round.id}>
              {unlocked ? (
                <Link
                  href={`/play/?round=${round.id}`}
                  className="block rounded-bubble focus-visible:outline-none"
                  aria-label={`${round.titleVi}${
                    best ? `, điểm tốt nhất ${best.score}` : ""
                  }`}
                >
                  <Card className="hover:bg-garden-sky">
                    <RoundBody
                      title={round.titleVi}
                      unlocked
                      bestScore={best?.score}
                    />
                  </Card>
                </Link>
              ) : (
                <Card aria-disabled className="opacity-70">
                  <RoundBody title={round.titleVi} unlocked={false} />
                </Card>
              )}
            </li>
          );
        })}
      </ul>

      {!ready && (
        <p className="mt-4 text-sm text-garden-soil" aria-live="polite">
          Đang tải tiến bộ…
        </p>
      )}
    </main>
  );
}

function RoundBody({
  title,
  unlocked,
  bestScore,
}: {
  title: string;
  unlocked: boolean;
  bestScore?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-xl font-bold">{title}</div>
        <div className="text-base text-garden-soil">
          {unlocked
            ? bestScore !== undefined
              ? `Điểm tốt nhất: ${bestScore}/${MAX_ROUND_SCORE}`
              : "Chưa làm lần nào"
            : "Chưa mở khóa"}
        </div>
      </div>
      <div className="text-3xl" aria-hidden>
        {unlocked ? "▶️" : "🔒"}
      </div>
    </div>
  );
}
