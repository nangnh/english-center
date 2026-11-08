import { ResultsClient } from "@/components/ResultsClient";

export default function ResultsPage({
  params,
}: {
  params: { attemptId: string };
}) {
  return <ResultsClient attemptId={params.attemptId} />;
}
