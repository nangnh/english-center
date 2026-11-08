import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-garden-leaf">
          English Garden 🌿
        </h1>
        <p className="mt-2 text-lg text-garden-ink">
          Khu vườn luyện tiếng Anh vui vẻ cho học sinh lớp 2.
        </p>
      </header>

      <nav aria-label="Màn hình chính" className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/topics"
          className="block rounded-bubble focus-visible:outline-none"
        >
          <Card className="h-full text-center hover:bg-garden-sky">
            <div className="text-4xl" aria-hidden>
              ⚡
            </div>
            <h2 className="mt-2 text-xl font-bold">Luyện nhanh</h2>
            <p className="mt-1 text-base">5 câu theo chủ đề, không tính giờ.</p>
          </Card>
        </Link>

        <Link
          href="/rounds"
          className="block rounded-bubble focus-visible:outline-none"
        >
          <Card className="h-full text-center hover:bg-garden-sky">
            <div className="text-4xl" aria-hidden>
              🏆
            </div>
            <h2 className="mt-2 text-xl font-bold">Vòng luyện</h2>
            <p className="mt-1 text-base">8 vòng, mỗi vòng 20 câu trong 30 phút.</p>
          </Card>
        </Link>

        <Link
          href="/progress"
          className="block rounded-bubble focus-visible:outline-none"
        >
          <Card className="h-full text-center hover:bg-garden-sky">
            <div className="text-4xl" aria-hidden>
              📈
            </div>
            <h2 className="mt-2 text-xl font-bold">Tiến bộ</h2>
            <p className="mt-1 text-base">Điểm, huy hiệu và thành tích trên máy.</p>
          </Card>
        </Link>
      </nav>

      <Card className="mt-8 bg-garden-sky/60">
        <h2 className="text-lg font-bold">Dành cho phụ huynh</h2>
        <p className="mt-1 text-base">
          Mọi điểm số và tiến bộ chỉ lưu trên thiết bị này, không có tài khoản
          hay kết nối mạng. Đây là sản phẩm luyện tập độc lập, không liên kết với
          IOE. Nội dung nên được người lớn xem trước khi dùng rộng rãi.
        </p>
      </Card>
    </main>
  );
}
