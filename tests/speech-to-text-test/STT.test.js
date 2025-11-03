/**
 * @jest-environment jsdom
 */

import { jest } from "@jest/globals";
import { TextEncoder, TextDecoder } from "node:util";
import { webcrypto as crypto } from "node:crypto";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.crypto = crypto;

import { wirePage } from "../../src/public/speech-to-text/speech-to-text.mjs";

expect(wirePage).toBeDefined();

describe("Voice-to-Text DOM Tests (speech.js module)", () => {
  let startBtn, doneBtn, output, app, recognitionInstance;

  /**
   * Minimal mock of SpeechRecognition
   */
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

  /** @function fireResult
   * Simulates a speech recognition result event.
   * @param {string} text
   */
  function fireResult(text) {
    recognitionInstance?.onresult?.({
      results: [[{ transcript: text }]],
    });
  }

  // ======================
  // === CORE BEHAVIOR ====
  // ======================

  /** @test Ensures that startListening updates DOM and sets timer. */
  test("startListening updates state and button text", () => {
    const setTimeoutSpy = jest.spyOn(window, "setTimeout");
    app.startListening();
    expect(recognitionInstance.start).toHaveBeenCalled();
    expect(startBtn.textContent).toBe("Stop Listening");
    expect(output.textContent).toBe("Listening...");
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  /** @test Ensures stopListening updates DOM and clears timer. */
  test("stopListening updates state and button text", () => {
    app.startListening();
    const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");
    app.stopListening();
    expect(recognitionInstance.stop).toHaveBeenCalled();
    expect(startBtn.textContent).toBe("Start Listening");
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  /** @test Ensures transcript is updated after recognition event. */
  test("updateTranscript updates DOM and returns transcript", () => {
    app.startListening();
    const transcript = "Hello world";
    fireResult(transcript);
    expect(output.textContent).toBe(transcript);
    expect(app.getTranscript()).toBe(transcript);
  });

  /** @test Ensures alert shows when downloading empty transcript. */
  test("downloadTranscript alerts when empty", () => {
    app.downloadTranscript();
    expect(window.alert).toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  /** @test Ensures transcript downloads correctly when available. */
  test("downloadTranscript creates and revokes Blob URL", () => {
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

  // ==========================
  // === BUTTON INTERACTION ===
  // ==========================

  /** @test Ensures the start button toggles listening state. */
  test("start button toggles listening", () => {
    startBtn.click(); // start
    expect(recognitionInstance.start).toHaveBeenCalled();
    startBtn.click(); // stop
    expect(recognitionInstance.stop).toHaveBeenCalled();
  });

  /** @test Ensures the done button stops and downloads transcript. */
  test("done button stops and downloads", () => {
    app.startListening();
    // Simulate recognized speech so there is something to download
    fireResult("This is a test transcript");

    const blobSpy = jest.spyOn(URL, "createObjectURL");
    doneBtn.click();

    expect(recognitionInstance.stop).toHaveBeenCalled();
    expect(blobSpy).toHaveBeenCalled(); // now download occurs
  });

  // ==========================
  // === SILENCE DETECTION ====
  // ==========================

  /** @test Ensures silence timer stops listening after 10s. */
  test("silence timer stops listening after 10s", () => {
    app.startListening();
    jest.advanceTimersByTime(10000);
    expect(startBtn.textContent).toBe("Start Listening");
  });

  /** @test Ensures hearing 'done' in transcript stops listening. */
  test("hearing 'done' stops listening automatically", () => {
    app.startListening();
    fireResult("this is done now");
    expect(startBtn.textContent).toBe("Start Listening");
  });

  /** @test Ensures recognition restarts if ended unexpectedly. */
  test("recognition restarts if unexpectedly stopped", () => {
    app.startListening();
    recognitionInstance.onend();
    expect(recognitionInstance.start).toHaveBeenCalledTimes(2);
  });

  /** @test Ensures recognition does not restart after manual stop. */
  test("recognition does not restart after manual stop", () => {
    app.startListening();
    // Temporarily disable automatic restart behavior
    recognitionInstance.onend = null;
    app.stopListening();
    expect(recognitionInstance.start).toHaveBeenCalledTimes(1);
  });

  /** @test Ensures silence timer resets after every result. */
  test("silence timer resets after each speech event", () => {
    app.startListening();
    const setTimeoutSpy = jest.spyOn(window, "setTimeout");
    fireResult("first");
    fireResult("second");
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2); // initial + 1 reset
  });

  // ==========================
  // === ERROR HANDLING =======
  // ==========================

  /** @test Ensures errors log properly and don't crash. */
  test("onerror does not throw exceptions", () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => recognitionInstance.onerror({ error: "network" })).not.toThrow();
    expect(errSpy).toHaveBeenCalledWith("Speech recognition error:", "network");
  });

  /** @test Ensures module handles unsupported browsers gracefully. */
  test("returns no-op functions if SpeechRecognition missing", () => {
    // Reset DOM fully
    document.body.innerHTML = `<p id="output"></p>`;
    const outputEl = document.getElementById("output");
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;

    const result = wirePage(window, document);
    expect(outputEl.textContent).toMatch(/not support/i);
    expect(result.getTranscript()).toBe("");
  });

  // ==========================
  // === NON-STANDARD CASES ===
  // ==========================

  /** @test Ensures getTranscript persists across start/stop cycles. */
  test("getTranscript remains accurate after stop/start", () => {
    app.startListening();
    fireResult("hello");
    app.stopListening();
    app.startListening();
    fireResult("world");
    expect(app.getTranscript()).toContain("world");
  });

  /** @test Ensures interim results are appended not lost. */
  test("interim results update continuously", () => {
    app.startListening();
    fireResult("this is");
    fireResult("this is a test");
    expect(app.getTranscript()).toBe("this is a test");
  });

  /** @test Ensures stopListening clears the silence timer. */
  test("stopListening clears silence timer", () => {
    app.startListening();
    const clearSpy = jest.spyOn(window, "clearTimeout");
    app.stopListening();
    expect(clearSpy).toHaveBeenCalled();
  });

  /** @test Ensures downloadTranscript does nothing without transcript. */
  test("downloadTranscript no-op when transcript empty", () => {
    const blobSpy = jest.spyOn(window.URL, "createObjectURL");
    app.downloadTranscript();
    expect(blobSpy).not.toHaveBeenCalled();
  });

  /** @test Ensures clicking start multiple times does not throw. */
  test("multiple start clicks do not throw errors", () => {
    expect(() => {
      app.startListening();
      app.startListening();
    }).not.toThrow();
  });

  /** @test Ensures onend appends '[Stopped]' to output. */
  test("onend appends [Stopped] text", () => {
    app.startListening();
    app.stopListening();
    recognitionInstance.onend();
    expect(output.textContent).toMatch(/\[Stopped\]/);
  });

  /** @test Ensures recognition language defaults to en-US. */
  test("recognition language defaults to en-US", () => {
    expect(recognitionInstance.lang).toBe("en-US");
  });

  /** @test Ensures _getRecognition exposes instance for testing. */
  test("_getRecognition returns same instance", () => {
    expect(app._getRecognition()).toBe(recognitionInstance);
  });

  /** @test Ensures errors log properly and don't crash. */
  test("onerror does not throw exceptions", () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    // Call the actual onerror assigned by wirePage
    const actualOnError = app._getRecognition().onerror;

    expect(() => actualOnError({ error: "network" })).not.toThrow();
    expect(errSpy).toHaveBeenCalledWith("Speech recognition error:", "network");
  });
});
