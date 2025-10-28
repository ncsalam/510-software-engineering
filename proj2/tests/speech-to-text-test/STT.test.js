/**
 * @jest-environment jsdom
 */

const { wirePage } = require("../../src/public/speech-to-text/speech-to-text.js");
expect(wirePage).toBeDefined();

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

  // --- 15 STT tests ---
  test("startListening updates state and button text", () => {
    const setTimeoutSpy = jest.spyOn(window, "setTimeout");
    app.startListening();
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
    fireResult("Hello world");
    expect(output.textContent).toBe("Hello world");
    expect(app.getTranscript()).toBe("Hello world");
  });

  test("downloadTranscript returns false if transcript empty", () => {
    app.downloadTranscript();
    expect(window.alert).toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  test("downloadTranscript works when transcript exists", () => {
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

  test("says 'done' stops recognition automatically", () => {
    app.startListening();
    fireResult("We are done here");
    expect(startBtn.textContent).toBe("Start Listening");
  });

  test("recognition onend restarts if still listening", () => {
    app.startListening();
    const startSpy = jest.spyOn(recognitionInstance, "start");
    recognitionInstance.onend();
    expect(startSpy).toHaveBeenCalled();
  });

  test("recognition onerror does not crash and maintains button text", () => {
    app.startListening();
    recognitionInstance.onerror({ error: "network" });
    expect(startBtn.textContent).toBe("Stop Listening");
  });

  test("handles multiple interim results correctly", () => {
    app.startListening();
    fireResult("Hello");
    fireResult("Hello world");
    expect(output.textContent).toBe("Hello world");
  });

  test("transcript concatenates correctly for multiple results", () => {
    app.startListening();
    fireResult("Hello");
    fireResult("world!");
    expect(app.getTranscript()).toBe("world!"); // final transcript overrides interim
  });

  test("silence timer stops listening after 10s inactivity", () => {
    app.startListening();
    jest.advanceTimersByTime(10000);
    expect(startBtn.textContent).toBe("Start Listening");
  });

  test("interim result does not break transcript", () => {
    app.startListening();
    fireResult("Interim");
    fireResult("Final result");
    expect(output.textContent).toBe("Final result");
  });

  test("empty transcript with spaces triggers alert on download", () => {
    app.startListening();
    fireResult("   ");
    app.downloadTranscript();
    expect(window.alert).toHaveBeenCalled();
  });

  test("multiple stop/start cycles maintain correct state", () => {
    app.startListening();
    app.stopListening();
    app.startListening();
    expect(startBtn.textContent).toBe("Stop Listening");
  });

  test("onresult with 'done' in sentence stops listening", () => {
    app.startListening();
    fireResult("Please be done now");
    expect(startBtn.textContent).toBe("Start Listening");
  });
});
