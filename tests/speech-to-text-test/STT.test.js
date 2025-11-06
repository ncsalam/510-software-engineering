/**
 * @jest-environment jsdom
 */

/**
 * @file Voice-to-Text Module Tests (No Transcript, 20 Tests)
 *
 * This suite tests the `wirePage` function from the `speech-to-text` module.
 * It validates core functionality, DOM interactions, silence detection,
 * automatic stop when saying "done", error handling, and the `onStop` callback.
 *
 * Transcript functionality has been removed.
 *
 * @module tests/speech-to-text-test/STT-no-transcript-20.test
 */

import { jest } from "@jest/globals";
import { wirePage } from "../../src/public/speech-to-text/speech-to-text.mjs";

describe("Voice-to-Text DOM Tests (No Transcript, 20 Tests)", () => {
  /** @type {HTMLElement} */
  let startBtn;
  /** @type {HTMLElement} */
  let doneBtn;
  /** @type {ReturnType<typeof wirePage>} */
  let app;
  /** @type {any} */
  let recognitionInstance;
  /** @type {jest.Mock} */
  let onStopCallback;

  /**
   * Minimal mock of SpeechRecognition for testing.
   * Provides spies for start/stop and supports onresult, onend, and onerror callbacks.
   * @class
   */
  class SRMock {
    constructor() {
      recognitionInstance = this;
      this.continuous = true;
      this.interimResults = false;
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

  /**
   * Sets up DOM, mocks, and initializes `wirePage` before each test.
   * @function
   */
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="start">Start Listening</button>
      <button id="done">Done</button>
    `;
    startBtn = document.getElementById("start");
    doneBtn = document.getElementById("done");

    window.SpeechRecognition = SRMock;
    window.webkitSpeechRecognition = SRMock;

    jest.useFakeTimers();

    onStopCallback = jest.fn();
    app = wirePage({ win: window, doc: document, onStop: onStopCallback });
  });

  /**
   * Cleans up timers, mocks, and resets recognition instance after each test.
   * @function
   */
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    recognitionInstance = null;
    onStopCallback.mockReset();
  });

  /**
   * Helper to simulate a SpeechRecognition `onresult` event.
   * @param {string} text - The simulated recognized speech text
   */
  function fireResult(text) {
    recognitionInstance?.onresult?.({
      results: [[{ transcript: text }]],
    });
  }

  // ======================
  // === CORE BEHAVIOR ====
  // ======================

  /** @test startListening should call recognition.start and update button text */
  test("startListening calls recognition.start and updates button text", () => {
    const setTimeoutSpy = jest.spyOn(window, "setTimeout");
    app.startListening();
    expect(recognitionInstance.start).toHaveBeenCalled();
    expect(startBtn.textContent).toBe("Stop Listening");
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  /** @test stopListening should call recognition.stop, update button, and trigger onStop */
  test("stopListening calls recognition.stop, updates button, and triggers onStop", () => {
    app.startListening();
    const clearSpy = jest.spyOn(window, "clearTimeout");
    app.stopListening();
    expect(recognitionInstance.stop).toHaveBeenCalled();
    expect(startBtn.textContent).toBe("Start Listening");
    expect(clearSpy).toHaveBeenCalled();
    expect(onStopCallback).toHaveBeenCalledTimes(1);
  });

  // ==========================
  // === BUTTON INTERACTIONS ===
  // ==========================

  /** @test Start button toggles listening correctly */
  test("start button toggles listening", () => {
    startBtn.click();
    expect(recognitionInstance.start).toHaveBeenCalled();
    startBtn.click();
    expect(recognitionInstance.stop).toHaveBeenCalled();
  });

  /** @test Done button stops listening and triggers onStop callback */
  test("done button stops listening and triggers onStop", () => {
    app.startListening();
    doneBtn.click();
    expect(recognitionInstance.stop).toHaveBeenCalled();
    expect(onStopCallback).toHaveBeenCalledTimes(1);
  });

  // ==========================
  // === SILENCE DETECTION ====
  // ==========================

  /** @test Silence timer stops listening after 10 seconds and triggers onStop */
  test("silence timer stops listening after 10s", () => {
    app.startListening();
    jest.advanceTimersByTime(10000);
    expect(startBtn.textContent).toBe("Start Listening");
    expect(onStopCallback).toHaveBeenCalledTimes(1);
  });

  /** @test Saying 'done' stops listening automatically and triggers onStop */
  test("hearing 'done' stops listening automatically and calls onStop", () => {
    app.startListening();
    fireResult("please stop done now");
    expect(startBtn.textContent).toBe("Start Listening");
    expect(onStopCallback).toHaveBeenCalledTimes(1);
  });

  /** @test Silence timer resets after each speech event */
  test("silence timer resets after each speech event", () => {
    app.startListening();
    const setTimeoutSpy = jest.spyOn(window, "setTimeout");
    fireResult("first");
    fireResult("second");
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
  });

  // ==========================
  // === RECOGNITION LIFECYCLE ===
  // ==========================

  /** @test Recognition restarts automatically if ended unexpectedly */
  test("recognition restarts automatically if ended unexpectedly", () => {
    app.startListening();
    recognitionInstance.onend();
    expect(recognitionInstance.start).toHaveBeenCalledTimes(2);
  });

  /** @test Recognition does not restart after manual stop */
  test("recognition does not restart after manual stop", () => {
    app.startListening();
    recognitionInstance.onend = null;
    app.stopListening();
    expect(recognitionInstance.start).toHaveBeenCalledTimes(1);
  });

  /** @test Multiple start calls do not throw errors */
  test("multiple start calls do not throw errors", () => {
    expect(() => {
      app.startListening();
      app.startListening();
    }).not.toThrow();
  });

  /** @test Multiple stop calls do not throw errors */
  test("multiple stop calls do not throw errors", () => {
    app.startListening();
    expect(() => {
      app.stopListening();
      app.stopListening();
    }).not.toThrow();
  });

  /** @test stopListening clears the silence timer */
  test("stopListening clears silence timer", () => {
    app.startListening();
    const clearSpy = jest.spyOn(window, "clearTimeout");
    app.stopListening();
    expect(clearSpy).toHaveBeenCalled();
  });

  // ==========================
  // === ERROR HANDLING =======
  // ==========================

  /** @test Errors are logged and do not throw exceptions */
  test("onerror logs the error correctly", () => {
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => recognitionInstance.onerror({ error: "network" })).not.toThrow();
    expect(errSpy).toHaveBeenCalledWith("Speech recognition error:", "network");
  });

  /** @test Unsupported browser returns no-op functions */
  test("unsupported browser returns no-op functions", () => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    const result = wirePage({ win: window, doc: document });
    expect(result.startListening).toBeDefined();
    expect(result.stopListening).toBeDefined();
    expect(result._getRecognition()).toBeNull();
  });

  // ==========================
  // === CALLBACK EDGE CASES ===
  // ==========================

  /** @test onStop callback works even if not provided */
  test("onStop callback works even if not provided", () => {
    const app2 = wirePage({ win: window, doc: document });
    expect(() => app2.stopListening()).not.toThrow();
  });

  /** @test onStop fires exactly once on manual stop */
  test("onStop fires exactly once on manual stop", () => {
    app.startListening();
    app.stopListening();
    expect(onStopCallback).toHaveBeenCalledTimes(1);
  });

  /** @test onStop fires exactly once when done button clicked */
  test("onStop fires exactly once when done button clicked", () => {
    app.startListening();
    doneBtn.click();
    expect(onStopCallback).toHaveBeenCalledTimes(1);
  });

  /** @test onStop fires exactly once when silence triggers */
  test("onStop fires exactly once when silence triggers", () => {
    app.startListening();
    jest.advanceTimersByTime(10000);
    expect(onStopCallback).toHaveBeenCalledTimes(1);
  });

  /** @test onStop fires exactly once when 'done' detected in speech */
  test("onStop fires exactly once when 'done' detected in speech", () => {
    app.startListening();
    fireResult("this is done");
    expect(onStopCallback).toHaveBeenCalledTimes(1);
  });

  // ==========================
  // === MISC BEHAVIORS ======
  // ==========================

  /** @test Recognition language defaults to 'en-US' */
  test("recognition language defaults to en-US", () => {
    expect(recognitionInstance.lang).toBe("en-US");
  });

  /** @test _getRecognition exposes the underlying recognition instance */
  test("_getRecognition returns same instance", () => {
    expect(app._getRecognition()).toBe(recognitionInstance);
  });
});
