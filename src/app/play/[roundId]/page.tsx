import { PlayClient } from "@/components/PlayClient";

export default function PlayPage({
  params,
}: {
  params: { roundId: string };
}) {
  return <PlayClient param={params.roundId} />;
}
