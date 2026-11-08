"use client";
import { useState } from "react";
import Link from "next/link";
import { useProgress } from "@/components/useProgress";
import { computeBadges, leaderboardRows } from "@/lib/badges";
import { ROUNDS, getRound } from "@/data";
import { MAX_ROUND_SCORE } from "@/lib/engine";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ProgressPage() {
  const { ready, progress, mode, message, clearAll } = useProgress();
  const [confirmStep, setConfirmStep] = useState(0);

  const badges = computeBadges(progress);
  const rows = leaderboardRows(progress);
  const unlocked = progress.unlockedRoundIds.length;

  function handleClear() {
    if (confirmStep === 0) {
      setConfirmStep(1);
      return;
    }
    clearAll();
    setConfirmStep(0);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-garden-leaf underline">
        ← Về trang chủ
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold text-garden-leaf">
        Tiến bộ 📈
      </h1>

      {!ready && (
        <p className="mt-2" aria-live="polite">
          Đang tải…
        </p>
      )}

      {(mode === "memory" || message) && (
        <Card className="mt-4 bg-garden-sun/20" role="status">
          <p className="text-base">
            {message ??
              "Đang dùng chế độ bộ nhớ tạm. Tiến bộ có thể không được giữ sau khi đóng tab."}
          </p>
        </Card>
      )}

      <Card className="mt-4">
        <p className="text-lg font-bold">Tổng quan (trên thiết bị này)</p>
        <ul className="mt-2 space-y-1 text-base">
          <li>Đã mở khóa: {unlocked}/{ROUNDS.length} vòng</li>
          <li>Số lượt đã chơi (gần đây): {progress.attempts.length}</li>
        </ul>
      </Card>

      <section aria-labelledby="badges-h" className="mt-6">
        <h2 id="badges-h" className="text-xl font-bold">
          Huy hiệu
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {badges.map((b) => (
            <li key={b.id}>
              <Card className={b.earned ? "" : "opacity-60"}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden>
                    {b.earned ? "🌸" : "🌱"}
                  </span>
                  <div>
                    <p className="font-bold">
                      {b.titleVi} {b.earned ? "" : "(chưa đạt)"}
                    </p>
                    <p className="text-sm text-garden-soil">
                      {b.descriptionVi}
                    </p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="board-h" className="mt-6">
        <h2 id="board-h" className="text-xl font-bold">
          Bảng thành tích (Trên thiết bị này)
        </h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-base">
            Chưa có điểm nào. Hãy thử một vòng luyện!
          </p>
        ) : (
          <table className="mt-3 w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-garden-leaf">
                <th className="py-2">Vòng</th>
                <th className="py-2">Điểm tốt nhất</th>
                <th className="py-2">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.roundId} className="border-b border-gray-200">
                  <td className="py-2">
                    {getRound(r.roundId)?.titleVi ?? r.roundId}
                  </td>
                  <td className="py-2">
                    {r.score}/{MAX_ROUND_SCORE}
                  </td>
                  <td className="py-2">{formatTime(r.timeMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="reset-h" className="mt-8">
        <h2 id="reset-h" className="text-xl font-bold">
          Dành cho phụ huynh: xóa dữ liệu
        </h2>
        <Card className="mt-3 bg-garden-petal/10">
          <p className="text-base">
            Thao tác này xóa toàn bộ điểm, huy hiệu và tiến bộ trên thiết bị này.
            Không thể hoàn tác.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Button
              variant={confirmStep === 1 ? "primary" : "secondary"}
              onClick={handleClear}
            >
              {confirmStep === 0
                ? "Xóa dữ liệu…"
                : "Bấm lần nữa để xác nhận xóa"}
            </Button>
            {confirmStep === 1 && (
              <Button variant="ghost" onClick={() => setConfirmStep(0)}>
                Hủy
              </Button>
            )}
          </div>
        </Card>
      </section>

      <footer className="mt-10 border-t border-gray-200 pt-4 text-sm text-garden-soil">
        English Garden là sản phẩm luyện tập độc lập, nội dung và hình ảnh tự
        sáng tác. Không liên kết, không phải bản sao và không được tài trợ bởi
        IOE. Mọi dữ liệu chỉ lưu trên thiết bị này.
      </footer>
    </main>
  );
}
