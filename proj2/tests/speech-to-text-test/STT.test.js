/**
 * @jest-environment jsdom
 */
import { jest } from "@jest/globals";
import { TextEncoder, TextDecoder } from "node:util";
import { webcrypto as crypto } from "node:crypto";

// Polyfills before anything else (some deps expect these on global)
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.crypto = crypto;

import { wirePage } from "../../src/public/speech-to-text/speech-to-text.mjs";

expect(wirePage).toBeDefined();

describe("Voice-to-Text DOM Tests (speech.js module)", () => {
  let startBtn, doneBtn, output, app, recognitionInstance;

  // Minimal SpeechRecognition mock class
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
        // simulate native onend firing when stop() is called
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

    // Mock browser APIs the module uses
    global.URL.createObjectURL = jest.fn(() => "blob:fake");
    global.URL.revokeObjectURL = jest.fn();
    jest.spyOn(window, "alert").mockImplementation(() => {});

    // Expose SpeechRecognition to the module
    window.SpeechRecognition = SRMock;
    window.webkitSpeechRecognition = SRMock;

    // Make timers controllable (for the 10s silence timer)
    jest.useFakeTimers();

    // Wire the module to this DOM, capture returned helpers
    app = wirePage(window, document);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    recognitionInstance = null;
  });

  // helper to simulate a recognition result event
  function fireResult(text) {
    recognitionInstance?.onresult?.({
      results: [[{ transcript: text }]],
    });
  }

  test("startListening updates state and button text", () => {
    // Spy on setTimeout to confirm the silence timer is scheduled
    const setTimeoutSpy = jest.spyOn(window, "setTimeout");

    app.startListening();

    expect(recognitionInstance).toBeTruthy();
    expect(recognitionInstance.start).toHaveBeenCalled();
    expect(startBtn.textContent).toBe("Stop Listening");
    expect(output.textContent).toBe("Listening...");
    expect(setTimeoutSpy).toHaveBeenCalled(); // silence timer scheduled (10s)
  });

  test("stopListening updates state and button text", () => {
    // Start first to ensure there's a timer to clear
    app.startListening();

    const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");
    app.stopListening();

    expect(recognitionInstance.stop).toHaveBeenCalled();
    expect(startBtn.textContent).toBe("Start Listening");
    expect(clearTimeoutSpy).toHaveBeenCalled(); // silence timer cleared
  });

  test("updateTranscript updates DOM and returns transcript", () => {
    // Begin listening so onresult is meaningful
    app.startListening();

    const transcript = "Hello world";
    fireResult(transcript);

    expect(output.textContent).toBe(transcript);
    expect(app.getTranscript()).toBe(transcript);
  });

  test("downloadTranscript returns false if transcript empty", () => {
    // In this module, downloadTranscript() shows alert and skips download when empty.
    // It doesn't return a boolean; we assert the side effects instead.
    app.downloadTranscript();

    expect(window.alert).toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    // For parity with original test's boolean, we confirm it's undefined.
    expect(app.downloadTranscript()).toBeUndefined();
  });

  test("downloadTranscript calls necessary functions when transcript exists", () => {
    // Produce a transcript
    app.startListening();
    fireResult("Test transcript");

    // Spy on DOM mutations for the temporary <a>
    const appendSpy = jest.spyOn(document.body, "appendChild");
    const removeSpy = jest.spyOn(document.body, "removeChild");

    app.downloadTranscript();

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
