"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ResultsClient } from "@/components/ResultsClient";

function ResultsParamBridge() {
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attempt") ?? "";
  return <ResultsClient attemptId={attemptId} />;
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-4 py-8" aria-live="polite">
          <p>Đang tải kết quả…</p>
        </main>
      }
    >
      <ResultsParamBridge />
    </Suspense>
  );
}
