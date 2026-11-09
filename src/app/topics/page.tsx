import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { TOPICS, TOPIC_LABELS_VI } from "@/types";
import { getQuestionsByTopic } from "@/data";

const TOPIC_EMOJI: Record<string, string> = {
  alphabet: "🔤",
  colours: "🎨",
  animals: "🐾",
  family: "👪",
  "school-things": "🎒",
  numbers: "🔢",
  food: "🍎",
};

export default function TopicsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-garden-leaf underline">
        ← Về trang chủ
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold text-garden-leaf">
        Luyện nhanh ⚡
      </h1>
      <p className="mt-2 text-lg">
        Chọn một chủ đề để làm 5 câu. Không giới hạn thời gian, không ảnh hưởng
        việc mở khóa vòng.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {TOPICS.map((topic) => {
          const count = getQuestionsByTopic(topic).length;
          return (
            <li key={topic}>
              <Link
                href={`/play/?round=quick-${topic}`}
                className="block rounded-bubble focus-visible:outline-none"
                aria-label={`Luyện nhanh chủ đề ${TOPIC_LABELS_VI[topic]}, ${count} câu`}
              >
                <Card className="flex items-center gap-4 hover:bg-garden-sky">
                  <span className="text-4xl" aria-hidden>
                    {TOPIC_EMOJI[topic]}
                  </span>
                  <span>
                    <span className="block text-xl font-bold">
                      {TOPIC_LABELS_VI[topic]}
                    </span>
                    <span className="block text-base text-garden-soil">
                      {count} câu để chọn
                    </span>
                  </span>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
