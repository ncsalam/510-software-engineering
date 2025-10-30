/**
 * @jest-environment jsdom
 */
import { jest } from "@jest/globals";
import { wirePage } from "../../src/public/speech-to-text/speech-to-text.mjs";

describe("Voice-to-Text DOM Tests (speech.js module)", () => {
  let startBtn, doneBtn, output, app, recognitionInstance;

  class SRMock {
    constructor() {
      recognitionInstance = this;
      this.continuous = true;
      this.interimResults = true;
      this.lang = "en-US";
      this.onresult = null;
      this.onend = null;
      this.onerror = null;
      this.start = jest.fn();
      this.stop = jest.fn(() => {
        if (typeof this.onend === "function") this.onend();
      });
    }
  }

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="start">Start Listening</button>
      <button id="done">Done / Save Transcript</button>
      <p id="output"></p>
    `;

    startBtn = document.getElementById("start");
    doneBtn = document.getElementById("done");
    output = document.getElementById("output");

    global.URL.createObjectURL = jest.fn(() => "blob:fake");
    global.URL.revokeObjectURL = jest.fn();
    jest.spyOn(window, "alert").mockImplementation(() => {});

    window.SpeechRecognition = SRMock;
    window.webkitSpeechRecognition = SRMock;

    jest.useFakeTimers();

    app = wirePage(window, document);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    recognitionInstance = null;
  });

  function fireResult(text) {
    recognitionInstance?.onresult?.({
      results: [[{ transcript: text }]],
    });
  }

  test("startListening updates state and button text", () => {
    const setTimeoutSpy = jest.spyOn(window, "setTimeout");
    app.startListening();

    expect(recognitionInstance).toBeTruthy();
    expect(recognitionInstance.start).toHaveBeenCalled();
    expect(startBtn.textContent).toBe("Stop Listening");
    expect(output.textContent).toBe("Listening...");
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  test("stopListening updates state and button text", () => {
    app.startListening();
    const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");
    app.stopListening();

    expect(recognitionInstance.stop).toHaveBeenCalled();
    expect(startBtn.textContent).toBe("Start Listening");
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  test("updateTranscript updates DOM and returns transcript", () => {
    app.startListening();
    const transcript = "Hello world";
    fireResult(transcript);

    expect(output.textContent).toBe(transcript);
    expect(app.getTranscript()).toBe(transcript);
  });

  test("downloadTranscript returns false if transcript empty", () => {
    app.downloadTranscript();
    expect(window.alert).toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  test("downloadTranscript calls necessary functions when transcript exists", () => {
    app.startListening();
    fireResult("Test transcript");

    const appendSpy = jest.spyOn(document.body, "appendChild");
    const removeSpy = jest.spyOn(document.body, "removeChild");

    app.downloadTranscript();

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
