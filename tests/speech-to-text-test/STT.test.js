/**
 * @jest-environment jsdom
 *
 * @fileoverview
 * Jest test suite for the speech-to-text module (`wirePage` function).
 * Covers standard functionality, edge cases, and non-standard scenarios.
 */

import { jest } from "@jest/globals";
import { TextEncoder, TextDecoder } from "node:util";
import { webcrypto as crypto } from "node:crypto";

// Polyfills for jsdom environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.crypto = crypto;

import { wirePage } from "../../src/public/speech-to-text/speech-to-text.mjs";

expect(wirePage).toBeDefined();

/**
 * @description
 * Test suite for the `wirePage()` function which connects DOM controls
 * to the Web Speech API for live speech-to-text transcription.
 */
describe("Voice-to-Text DOM Tests (speech.js module)", () => {
  let startBtn, doneBtn, output, app, recognitionInstance;

  /**
   * @class SRMock
   * @classdesc
   * Minimal mock class that simulates the `SpeechRecognition` API.
   * Used to test `wirePage` without invoking real browser speech APIs.
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
        // Simulate that the recognition engine triggers `onend` after stop()
        if (typeof this.onend === "function") this.onend();
      });
    }
  }

  /**
   * @function fireResult
   * @description
   * Helper to simulate the `onresult` event emitted by SpeechRecognition.
   * @param {string} text - The recognized transcript text.
   */
  function fireResult(text) {
    recognitionInstance?.onresult?.({
      results: [[{ transcript: text }]],
    });
  }

  /**
   * @function beforeEach
   * @description
   * Sets up a clean DOM, mocks browser APIs, and initializes `wirePage` before each test.
   */
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="start">Start Listening</button>
      <button id="done">Done / Save Transcript</button>
      <p id="output"></p>
    `;
    startBtn = document.getElementById("start");
    doneBtn = document.getElementById("done");
    output = document.getElementById("output");

    // Mock global APIs used in the module
    global.URL.createObjectURL = jest.fn(() => "blob:fake");
    global.URL.revokeObjectURL = jest.fn();
    jest.spyOn(window, "alert").mockImplementation(() => {});

    // Inject SpeechRecognition mock
    window.SpeechRecognition = SRMock;
    window.webkitSpeechRecognition = SRMock;

    // Use fake timers for silence timeout
    jest.useFakeTimers();

    // Wire up the speech module
    app = wirePage(window, document);
  });

  /**
   * @function afterEach
   * @description
   * Resets mocks, clears timers, and restores the environment after each test.
   */
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    recognitionInstance = null;
  });

  // ==============================
  // ✅ STANDARD FUNCTIONALITY TESTS
  // ==============================

  /** @test Verifies that startListening updates state and UI correctly. */
  test("startListening updates state and UI", () => {
    const setTimeoutSpy = jest.spyOn(window, "setTimeout");
    app.startListening();
    expect(recognitionInstance.start).toHaveBeenCalled();
    expect(startBtn.textContent).toBe("Stop Listening");
    expect(output.textContent).toBe("Listening...");
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  /** @test Verifies that stopListening stops recognition and resets UI. */
  test("stopListening updates state and UI", () => {
    app.startListening();
    const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");
    app.stopListening();
    expect(recognitionInstance.stop).toHaveBeenCalled();
    expect(startBtn.textContent).toBe("Start Listening");
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  /** @test Ensures getTranscript returns the latest recognized text. */
  test("getTranscript returns current transcript", () => {
    app.startListening();
    fireResult("hello test");
    expect(app.getTranscript()).toBe("hello test");
  });

  /** @test Ensures downloadTranscript alerts user when no transcript is available. */
  test("downloadTranscript alerts when empty", () => {
    app.downloadTranscript();
    expect(window.alert).toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  /** @test Ensures downloadTranscript creates blob URL and cleans up DOM. */
  test("downloadTranscript creates and revokes blob URL", () => {
    app.startListening();
    fireResult("example");
    const appendSpy = jest.spyOn(document.body, "appendChild");
    const removeSpy = jest.spyOn(document.body, "removeChild");
    app.downloadTranscript();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  // ===============================
  // 🧩 INTERACTION & EVENT TESTS
  // ===============================

  /** @test Verifies that the start button toggles between start and stop. */
  test("start button toggles listening", () => {
    const startSpy = jest.spyOn(app, "startListening");
    const stopSpy = jest.spyOn(app, "stopListening");
    startBtn.click(); // start
    startBtn.click(); // stop
    expect(startSpy).toHaveBeenCalled();
    expect(stopSpy).toHaveBeenCalled();
  });

  /** @test Verifies that clicking 'Done' stops listening and downloads transcript. */
  test("done button stops and downloads", () => {
    const stopSpy = jest.spyOn(app, "stopListening");
    const downloadSpy = jest.spyOn(app, "downloadTranscript");
    doneBtn.click();
    expect(stopSpy).toHaveBeenCalled();
    expect(downloadSpy).toHaveBeenCalled();
  });

  /** @test Ensures the silence timer automatically stops listening after 10s. */
  test("silence timer stops listening after 10s", () => {
    const stopSpy = jest.spyOn(app, "stopListening");
    app.startListening();
    jest.advanceTimersByTime(10000);
    expect(stopSpy).toHaveBeenCalled();
  });

  /** @test Ensures the word 'done' in transcript stops listening automatically. */
  test("hearing 'done' stops listening automatically", () => {
    const stopSpy = jest.spyOn(app, "stopListening");
    app.startListening();
    fireResult("this is done now");
    expect(stopSpy).toHaveBeenCalled();
  });

  // ==============================
  // 🔁 RECOGNITION LIFECYCLE TESTS
  // ==============================

  /** @test Ensures recognition restarts automatically when onend fires mid-listen. */
  test("recognition restarts automatically onend while listening", () => {
    app.startListening();
    recognitionInstance.onend();
    expect(recognitionInstance.start).toHaveBeenCalledTimes(2);
  });

  /** @test Ensures recognition does not restart when manually stopped. */
  test("recognition does not restart after manual stop", () => {
    app.startListening();
    app.stopListening();
    recognitionInstance.onend();
    expect(recognitionInstance.start).toHaveBeenCalledTimes(1);
  });

  /** @test Ensures that errors during recognition do not throw exceptions. */
  test("onerror does not throw exceptions", () => {
    expect(() => recognitionInstance.onerror({ error: "network" })).not.toThrow();
  });

  /** @test Ensures that the output displays '[Stopped]' after recognition ends. */
  test("output displays [Stopped] after onend when not listening", () => {
    app.startListening();
    fireResult("some text");
    app.stopListening();
    recognitionInstance.onend();
    expect(output.textContent).toContain("[Stopped]");
  });

  // ==============================
  // ⚙️ NON-STANDARD / EDGE CASES
  // ==============================

  /** @test Ensures multiple calls to startListening do not throw errors. */
  test("calling startListening twice doesn't crash", () => {
    app.startListening();
    expect(() => app.startListening()).not.toThrow();
  });

  /** @test Ensures wirePage works gracefully when SpeechRecognition is missing. */
  test("wirePage gracefully handles missing SpeechRecognition", () => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    const newApp = wirePage(window, document);
    expect(newApp.getTranscript()).toBe("");
    expect(typeof newApp.startListening).toBe("function");
  });

  /** @test Ensures output updates properly with successive interim results. */
  test("output updates multiple times with successive transcripts", () => {
    app.startListening();
    fireResult("hello");
    fireResult("world");
    expect(output.textContent).toBe("world");
  });

  /** @test Ensures downloadTranscript handles large transcripts without errors. */
  test("downloadTranscript handles large transcripts gracefully", () => {
    const largeText = "A".repeat(100000);
    app.startListening();
    fireResult(largeText);
    expect(() => app.downloadTranscript()).not.toThrow();
  });

  /** @test Verifies that silence timer resets after each speech event. */
  test("silence timer resets after each speech event", () => {
    app.startListening();
    const setTimeoutSpy = jest.spyOn(window, "setTimeout");
    fireResult("first");
    fireResult("second");
    expect(setTimeoutSpy).toHaveBeenCalledTimes(3); // initial + 2 resets
  });

  /** @test Ensures getTranscript remains accurate after stop/start cycle. */
  test("getTranscript remains accurate after stop/start cycle", () => {
    app.startListening();
    fireResult("first");
    app.stopListening();
    app.startListening();
    fireResult("second");
    expect(app.getTranscript()).toBe("second");
  });

  /** @test Ensures wirePage returns all expected helper functions. */
  test("wirePage returns all helper methods", () => {
    const keys = Object.keys(app);
    expect(keys).toEqual(
      expect.arrayContaining([
        "startListening",
        "stopListening",
        "downloadTranscript",
        "getTranscript",
        "_getRecognition",
      ])
    );
  });
});
