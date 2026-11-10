import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AudioButton } from "@/components/AudioButton";
import { playText, type PlayOutcome } from "@/lib/audio";
import { getAudioManifest } from "@/lib/audioManifest";

// Mock chiến lược (task 7.2):
//  - "@/lib/audio": kiểm soát PlayOutcome của playText theo từng test, và xác
//    minh nó được gọi với đúng `text` của component.
//  - "@/lib/audioManifest": getAudioManifest resolve ngay về manifest rỗng
//    (component await nó trước khi gọi playText).
//  - "@/lib/speech": getBrowserSpeechEnv/cancelSpeech là no-op (component không
//    nên phụ thuộc môi trường Web Speech thật trong test — mọi quyết định đến
//    từ PlayOutcome mà playText trả về).

vi.mock("@/lib/audio", () => ({
  playText: vi.fn(),
  // stopCurrent được gọi trong effect cleanup khi unmount.
  stopCurrent: vi.fn(),
}));

vi.mock("@/lib/audioManifest", () => ({
  getAudioManifest: vi.fn(),
}));

vi.mock("@/lib/speech", () => ({
  getBrowserSpeechEnv: vi.fn(() => ({ synth: null, makeUtterance: vi.fn() })),
  cancelSpeech: vi.fn(),
}));

const mockedPlayText = vi.mocked(playText);
const mockedGetManifest = vi.mocked(getAudioManifest);

/** Promise có thể giải quyết bằng tay — mô phỏng trạng thái "đang phát" kéo dài. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  // Manifest rỗng, resolve ngay (component await trước khi gọi playText).
  mockedGetManifest.mockResolvedValue({ version: 1, byText: {} });
  // Mặc định: phát tệp thành công.
  mockedPlayText.mockResolvedValue("played-file");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AudioButton (native-pronunciation task 7.2)", () => {
  it("render accessible name tiếng Việt và nhãn/biểu tượng hiển thị (R6.5, R6.1)", () => {
    render(<AudioButton text="cat" />);
    // Accessible name = aria-label tiếng Việt (R6.5).
    const btn = screen.getByRole("button", { name: "Nghe phát âm tiếng Anh" });
    expect(btn).toBeInTheDocument();
    // Nhãn mặc định "Nghe" + biểu tượng loa hiển thị (R6.1).
    expect(btn).toHaveTextContent("Nghe");
    expect(btn).toHaveTextContent("🔊");
  });

  it("dùng label tùy biến khi được cung cấp (R6.1)", () => {
    render(<AudioButton text="cat" label="Nghe từ" />);
    const btn = screen.getByRole("button", { name: "Nghe phát âm tiếng Anh" });
    expect(btn).toHaveTextContent("Nghe từ");
  });

  it("touch target 44×44 qua class trên nút (R6.1)", () => {
    render(<AudioButton text="cat" />);
    const btn = screen.getByRole("button", { name: "Nghe phát âm tiếng Anh" });
    // Lớp đặt tường minh trên AudioButton.
    expect(btn.className).toContain("min-w-11");
    expect(btn.className).toContain("min-h-11");
    // Lớp 44px kế thừa từ Button cơ sở.
    expect(btn.className).toContain("min-h-[44px]");
    expect(btn.className).toContain("min-w-[44px]");
  });

  it("phím Enter kích hoạt phát với đúng text (R6.2)", async () => {
    const user = userEvent.setup();
    render(<AudioButton text="apple" />);
    const btn = screen.getByRole("button", { name: "Nghe phát âm tiếng Anh" });
    btn.focus();
    expect(btn).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(mockedPlayText).toHaveBeenCalled());
    // Được gọi với text của component (đối số thứ 2 của playText(env, text)).
    expect(mockedPlayText).toHaveBeenLastCalledWith(
      expect.anything(),
      "apple"
    );
  });

  it("phím Space kích hoạt phát với đúng text (R6.2)", async () => {
    const user = userEvent.setup();
    render(<AudioButton text="banana" />);
    const btn = screen.getByRole("button", { name: "Nghe phát âm tiếng Anh" });
    btn.focus();
    await user.keyboard("{ }"); // phím Space
    await waitFor(() => expect(mockedPlayText).toHaveBeenCalled());
    expect(mockedPlayText).toHaveBeenLastCalledWith(
      expect.anything(),
      "banana"
    );
  });

  it("trạng thái playing: aria-busy=true + biểu tượng đang phát, về false khi xong (R6.4)", async () => {
    const d = deferred<PlayOutcome>();
    mockedPlayText.mockReturnValue(d.promise);

    const user = userEvent.setup();
    render(<AudioButton text="cat" />);
    const btn = screen.getByRole("button", { name: "Nghe phát âm tiếng Anh" });

    await user.click(btn);

    // Trong khi playText còn pending: aria-busy="true" và biểu tượng "🔈".
    await waitFor(() => expect(btn).toHaveAttribute("aria-busy", "true"));
    expect(btn).toHaveTextContent("🔈");

    // Giải quyết -> về idle: aria-busy="false", biểu tượng "🔊".
    d.resolve("played-file");
    await waitFor(() => expect(btn).toHaveAttribute("aria-busy", "false"));
    expect(btn).toHaveTextContent("🔊");
  });

  it("unavailable: nút bị disable, role=status báo thông báo cố định, gọi onUnavailable (R3.4, R6.6)", async () => {
    mockedPlayText.mockResolvedValue("unavailable");
    const onUnavailable = vi.fn();

    const user = userEvent.setup();
    render(<AudioButton text="cat" onUnavailable={onUnavailable} />);
    const btn = screen.getByRole("button", { name: "Nghe phát âm tiếng Anh" });

    await user.click(btn);

    await waitFor(() => expect(btn).toBeDisabled());
    expect(onUnavailable).toHaveBeenCalledTimes(1);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(
      "Không phát được giọng tiếng Anh trên thiết bị này."
    );
    // Thông báo đúng CHÍNH XÁC (cố định).
    expect(status.textContent?.trim()).toBe(
      "Không phát được giọng tiếng Anh trên thiết bị này."
    );
  });

  it("error: báo lỗi qua role=status NHƯNG nút giữ enable và kích hoạt lại được (R6.7)", async () => {
    // Lần đầu playText ném -> trạng thái error; lần hai phát bình thường.
    mockedPlayText
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("played-file");

    const user = userEvent.setup();
    render(<AudioButton text="cat" />);
    const btn = screen.getByRole("button", { name: "Nghe phát âm tiếng Anh" });

    await user.click(btn);

    // Thông báo lỗi xuất hiện trong vùng role="status".
    const status = screen.getByRole("status");
    await waitFor(() =>
      expect(status.textContent?.trim()).not.toBe("")
    );
    expect(status.textContent).toMatch(/thử lại/i);

    // Nút KHÔNG bị disable -> kích hoạt lại được (R6.7).
    expect(btn).not.toBeDisabled();
    expect(mockedPlayText).toHaveBeenCalledTimes(1);

    // Kích hoạt lần hai -> playText được gọi lần nữa.
    await user.click(btn);
    await waitFor(() => expect(mockedPlayText).toHaveBeenCalledTimes(2));
  });
});
