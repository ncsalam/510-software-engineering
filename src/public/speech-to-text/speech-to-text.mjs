/**
 * Initializes and wires up SpeechRecognition with page controls.
 *
 * Expected DOM elements (by ID):
 *   - `#start` : Button that toggles start/stop listening
 *   - `#done`  : Button that stops listening
 *
 * This function sets up a continuous SpeechRecognition instance and manages:
 *   - Microphone start/stop control
 *   - Automatic stop after silence
 *   - Automatic stop if user says "done"
 *
 * No transcript is stored, displayed, or downloaded.
 *
 * @param {Object} [options] - Optional configuration object.
 * @param {Window} [options.win=window] - The window object (useful for testing/mocking).
 * @param {Document} [options.doc=document] - The document object (useful for testing/mocking).
 * @param {function(): void} [options.onStop] - Callback fired whenever listening stops.
 *
 * @returns {Object} API for controlling speech recognition.
 * @returns {function(): void} return.startListening - Starts speech recognition manually.
 * @returns {function(): void} return.stopListening - Stops speech recognition manually.
 * @returns {function(): SpeechRecognition} return._getRecognition - Returns the underlying SpeechRecognition instance.
 *
 * @example
 * const speech = wirePage({
 *   onStop: () => console.log("Mic stopped listening"),
 * });
 *
 * // Start listening
 * speech.startListening();
 *
 * // Stop listening manually
 * speech.stopListening();
 */
export function wirePage({ win = window, doc = document, onStop } = {}) {
  /** @type {HTMLElement | null} */
  const startBtn = doc.getElementById("start");
  /** @type {HTMLElement | null} */
  const doneBtn = doc.getElementById("done");

  const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn("Speech Recognition not supported.");
    return {
      startListening: () => {},
      stopListening: () => {},
      _getRecognition: () => null,
    };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  let isListening = false;
  let silenceTimer = null;

  /**
   * Resets the silence detection timer.
   * Stops listening automatically after 10 seconds of silence.
   * @private
   */
  function resetSilenceTimer() {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = win.setTimeout(() => stopListening(), 10000);
  }

  /**
   * Starts the speech recognition process.
   * Updates button text and resets silence timer.
   */
  function startListening() {
    try {
      recognition.start();
      isListening = true;
      if (startBtn) startBtn.textContent = "Stop Listening";
      resetSilenceTimer();
    } catch {
      // Ignore if already started
    }
  }

  /**
   * Stops the speech recognition process.
   * Updates button text, clears silence timer, and calls onStop callback.
   */
  function stopListening() {
    try {
      recognition.stop();
    } finally {
      isListening = false;
      if (startBtn) startBtn.textContent = "Start Listening";
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = null;
      if (typeof onStop === "function") onStop();
    }
  }

  /**
   * Handles speech recognition results.
   * Stops listening if the user says "done".
   * @private
   * @param {SpeechRecognitionEvent} event
   */
  recognition.onresult = (event) => {
    resetSilenceTimer();

    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ")
      .trim();

    if (/\bdone\b/i.test(transcript)) {
      stopListening();
    }
  };

  /**
   * Called when speech recognition ends.
   * Automatically restarts if listening was active.
   * @private
   */
  recognition.onend = () => {
    if (isListening) recognition.start();
  };

  /**
   * Handles speech recognition errors.
   * Logs them to the console.
   * @private
   * @param {SpeechRecognitionError} event
   */
  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
  };

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      isListening ? stopListening() : startListening();
    });
  }

  if (doneBtn) {
    doneBtn.addEventListener("click", () => stopListening());
  }

  return {
    startListening,
    stopListening,
    _getRecognition: () => recognition,
  };
}
