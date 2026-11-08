import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AudioButton } from "@/components/AudioButton";

function installSpeech(voices: Array<{ lang: string }>, speakImpl?: () => void) {
  const synth = {
    getVoices: () => voices as unknown as SpeechSynthesisVoice[],
    cancel: vi.fn(),
    speak: speakImpl ?? vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onvoiceschanged: null,
  };
  const Utterance = function (this: Record<string, unknown>, text: string) {
    this.text = text;
    this.lang = "";
    this.rate = 1;
  };
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
}

function clearSpeech() {
  vi.unstubAllGlobals();
}

afterEach(() => {
  clearSpeech();
  vi.restoreAllMocks();
});

describe("AudioButton (R5)", () => {
  it("có giọng tiếng Anh: hiện nút Nghe và phát được", async () => {
    installSpeech([{ lang: "en-US" }]);
    const user = userEvent.setup();
    render(<AudioButton text="cat" />);
    const btn = await screen.findByRole("button", { name: /Nghe/i });
    await user.click(btn);
    // Không ném lỗi và nút vẫn còn.
    expect(btn).toBeInTheDocument();
  });

  it("không có giọng tiếng Anh: hiện thông báo không phát được", async () => {
    installSpeech([{ lang: "vi-VN" }]);
    render(<AudioButton text="cat" />);
    await waitFor(() =>
      expect(
        screen.getByText(/Không phát được giọng tiếng Anh/i)
      ).toBeInTheDocument()
    );
  });

  it("speak ném lỗi -> gọi onUnavailable", async () => {
    installSpeech([{ lang: "en-US" }], () => {
      throw new Error("boom");
    });
    const onUnavailable = vi.fn();
    const user = userEvent.setup();
    render(<AudioButton text="cat" onUnavailable={onUnavailable} />);
    const btn = await screen.findByRole("button", { name: /Nghe/i });
    await user.click(btn);
    expect(onUnavailable).toHaveBeenCalled();
  });
});
