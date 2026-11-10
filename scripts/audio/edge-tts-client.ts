// Triển khai TtsClient thật dựa trên Microsoft Edge TTS miễn phí (msedge-tts).
// Chạy ở build-time (Node) — KHÔNG phụ thuộc DOM. Generator nhận client này qua
// dependency injection nên có thể thay bằng client giả khi test (không mạng, không tệp).
//
// Edge TTS KHÔNG cần khóa truy cập (R4.1): truy cập dịch vụ "Read Aloud" của
// Microsoft Edge với giọng neural bản ngữ, không tính phí theo ký tự/lượt gọi.
//
// _Requirements: 1.4, 1.5, 4.1, 4.2 (build-time), 1.7, 4.5_

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { ssmlRate } from "./config.js";

/**
 * Tùy chọn tổng hợp cho một lần gọi TTS.
 *  - `voice`: tên giọng (ShortName) của Edge TTS, ví dụ "en-US-AriaNeural".
 *  - `ratePercent`: tốc độ đọc theo phần trăm tốc độ gốc, trong [80, 90] (R1.5).
 *    Client chuyển thành SSML prosody `rate` tương đối (ví dụ 85 → "-15%").
 */
export interface SynthesizeOptions {
  voice: string;
  ratePercent: number;
}

/**
 * Hợp đồng tối thiểu mà TTS_Generator phụ thuộc vào. Trả về Buffer chứa dữ liệu
 * `.mp3` cho văn bản đầu vào; NÉM lỗi nếu tổng hợp thất bại (để generator gom vào
 * `failed` và KHÔNG ghi đè tệp hợp lệ đã có — R1.7, R4.5).
 *
 * Tách interface này giúp generator test được mà không cần mạng: test inject một
 * client giả (sinh buffer giả lập hoặc ném lỗi theo kịch bản).
 */
export interface TtsClient {
  synthesize(text: string, opts: SynthesizeOptions): Promise<Buffer>;
}

/**
 * Gom toàn bộ một luồng audio của msedge-tts thành một Buffer `.mp3`.
 * Nếu luồng phát lỗi (endpoint không truy cập được, timeout tổng hợp...), Promise
 * bị reject để tầng trên xử lý như một mục `failed`.
 */
function collectStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("close", () => resolve(Buffer.concat(chunks)));
    stream.on("error", (err) => reject(err));
  });
}

/**
 * TtsClient thật dùng msedge-tts. Mỗi lần {@link synthesize} mở một phiên
 * MsEdgeTTS, đặt giọng + định dạng mp3, truyền văn bản với prosody rate tương ứng,
 * gom luồng thành Buffer rồi đóng kết nối.
 *
 * Định dạng đầu ra: mp3 24kHz 48kbit mono — nhẹ, phù hợp từ/câu ngắn cho trẻ em.
 */
export class EdgeTtsClient implements TtsClient {
  async synthesize(text: string, opts: SynthesizeOptions): Promise<Buffer> {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(
        opts.voice,
        OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
      );
      const { audioStream } = tts.toStream(text, {
        rate: ssmlRate(opts.ratePercent),
      });
      const buffer = await collectStream(audioStream);
      if (buffer.length === 0) {
        // Buffer rỗng = tổng hợp không ra dữ liệu; coi là lỗi để KHÔNG ghi tệp hỏng.
        throw new Error("Edge TTS trả về luồng audio rỗng");
      }
      return buffer;
    } finally {
      tts.close();
    }
  }
}
