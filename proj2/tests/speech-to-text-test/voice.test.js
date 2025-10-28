/**
 * @jest-environment jsdom
 */

const {
  startListening,
  stopListening,
  updateTranscript,
  downloadTranscript,
} = require("./voice");

describe("Voice Module Tests (voice.js)", () => {
  let startBtn, doneBtn, output, recognitionMock;
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="start">Start Listening</button>
      <button id="done">Done / Save Transcript</button>
      <p id="output"></p>
    `;
    startBtn = document.getElementById("start");
    doneBtn = document.getElementById("done");
    output = document.getElementById("output");

    recognitionMock = {
      start: jest.fn(),
      stop: jest.fn(),
    };
  });

  // --- 15 Voice tests ---
  test("startListening calls recognition.start and updates button/text", () => {
    const resetTimer = jest.fn();
    startListening(recognitionMock, startBtn, output, resetTimer);
    expect(recognitionMock.start).toHaveBeenCalled();
    expect(startBtn.textContent).toBe("Stop Listening");
    expect(output.textContent).toBe("Listening...");
    expect(resetTimer).toHaveBeenCalled();
  });

  test("stopListening calls recognition.stop and updates button/text", () => {
    const clearTimer = jest.fn();
    stopListening(recognitionMock, startBtn, clearTimer);
    expect(recognitionMock.stop).toHaveBeenCalled();
    expect(startBtn.textContent).toBe("Start Listening");
    expect(clearTimer).toHaveBeenCalled();
  });

  test("updateTranscript sets output text and returns value", () => {
    const transcript = "Hello world";
    const result = updateTranscript(transcript, output);
    expect(output.textContent).toBe(transcript);
    expect(result).toBe(transcript);
  });

  test("downloadTranscript returns false for empty transcript", () => {
    const result = downloadTranscript("", jest.fn(), jest.fn(), jest.fn(), jest.fn());
    expect(result).toBe(false);
  });

  test("downloadTranscript calls all necessary functions for valid transcript", () => {
    const createURL = jest.fn().mockReturnValue("blob:fake");
    const append = jest.fn();
    const remove = jest.fn();
    const revoke = jest.fn();

    const transcript = "Sample text";
    const result = downloadTranscript(transcript, createURL, append, remove, revoke);

    expect(result).toBe(true);
    expect(createURL).toHaveBeenCalled();
    expect(append).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalled();
  });

  test("startListening multiple calls maintain correct state", () => {
    const resetTimer = jest.fn();
    startListening(recognitionMock, startBtn, output, resetTimer);
    startListening(recognitionMock, startBtn, output, resetTimer);
    expect(startBtn.textContent).toBe("Stop Listening");
  });

  test("stopListening multiple calls maintain correct state", () => {
    const clearTimer = jest.fn();
    stopListening(recognitionMock, startBtn, clearTimer);
    stopListening(recognitionMock, startBtn, clearTimer);
    expect(startBtn.textContent).toBe("Start Listening");
  });

  test("updateTranscript overwrites previous transcript", () => {
    updateTranscript("First", output);
    const result = updateTranscript("Second", output);
    expect(output.textContent).toBe("Second");
    expect(result).toBe("Second");
  });

  test("downloadTranscript handles large text correctly", () => {
    const largeText = "A".repeat(10000);
    const createURL = jest.fn().mockReturnValue("blob:large");
    const append = jest.fn();
    const remove = jest.fn();
    const revoke = jest.fn();
    const result = downloadTranscript(largeText, createURL, append, remove, revoke);

    expect(result).toBe(true);
    expect(createURL).toHaveBeenCalled();
    expect(append).toHaveBeenCalled();
    expect(remove).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalled();
  });

  test("downloadTranscript trims spaces and still downloads", () => {
    const transcript = "   text with spaces   ";
    const createURL = jest.fn().mockReturnValue("blob:space");
    const append = jest.fn();
    const remove = jest.fn();
    const revoke = jest.fn();
    const result = downloadTranscript(transcript, createURL, append, remove, revoke);
    expect(result).toBe(true);
  });

  test("updateTranscript with empty string clears output", () => {
    updateTranscript("Non-empty", output);
    updateTranscript("", output);
    expect(output.textContent).toBe("");
  });

  test("startListening does not throw if resetSilenceTimer is missing", () => {
    expect(() => startListening(recognitionMock, startBtn, output, () => {})).not.toThrow();
  });

  test("stopListening does not throw if clearTimeout is missing", () => {
    expect(() => stopListening(recognitionMock, startBtn, () => {})).not.toThrow();
  });

  test("downloadTranscript handles special characters in transcript", () => {
    const specialText = "Line1\nLine2\t€£$";
    const createURL = jest.fn().mockReturnValue("blob:special");
    const append = jest.fn();
    const remove = jest.fn();
    const revoke = jest.fn();
    const result = downloadTranscript(specialText, createURL, append, remove, revoke);
    expect(result).toBe(true);
  });

  test("downloadTranscript returns false for whitespace-only text", () => {
    const result = downloadTranscript("   \n\t ", jest.fn(), jest.fn(), jest.fn(), jest.fn());
    expect(result).toBe(false);
  });
});
