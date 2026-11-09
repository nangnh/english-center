"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PlayClient } from "@/components/PlayClient";

function PlayParamBridge() {
  const searchParams = useSearchParams();
  const round = searchParams.get("round") ?? "";
  return <PlayClient param={round} />;
}

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-4 py-8" aria-live="polite">
          <p>Đang chuẩn bị bài…</p>
        </main>
      }
    >
      <PlayParamBridge />
    </Suspense>
  );
}
