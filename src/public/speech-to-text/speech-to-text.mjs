/**
 * Initializes and wires up SpeechRecognition with page controls.
 * 
 * Expects the following DOM elements (by ID) if present:
 *   - `#start`  : Button to toggle start/stop listening
 *   - `#done`   : Button to stop listening and download transcript
 *   - `#output` : Element (<p> or <div>) to display live transcript
 * 
 * This function sets up a continuous SpeechRecognition instance, manages
 * listening state, silence detection, and allows downloading the transcript
 * as a text file. It also attaches event listeners to the `start` and `done`
 * buttons if present.
 * 
 * @param {Window} [win=window] - The global window object; defaults to current window.
 * @param {Document} [doc=document] - The document object; defaults to current document.
 * @returns {Object} An object containing helper functions:
 * @returns {function(): void} return.startListening - Starts speech recognition.
 * @returns {function(): void} return.stopListening - Stops speech recognition.
 * @returns {function(): void} return.downloadTranscript - Downloads the recognized transcript as a text file.
 * @returns {function(): string} return.getTranscript - Returns the current transcript as a string.
 * @returns {function(): SpeechRecognition} return._getRecognition - Returns the underlying SpeechRecognition instance (useful for advanced testing/mocking).
 * 
 * @throws {Error} Throws if the browser does not support SpeechRecognition (though in this implementation, it fails silently and returns no-op functions).
 * @module public/speech-to-text/speech-to-text
 */


export function wirePage(win = window, doc = document) {
  // === DOM ELEMENTS ===
  const startBtn = doc.getElementById("start");
  const doneBtn = doc.getElementById("done");
  const output = doc.getElementById("output");

  // === SETUP SPEECH RECOGNITION ===
  const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (output) output.textContent = "Sorry, your browser does not support Speech Recognition.";
    return {
      startListening: () => {},
      stopListening: () => {},
    //   downloadTranscript: () => {},
      getTranscript: () => "",
    };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  // === STATE VARIABLES ===
  let isListening = false; // Whether the mic is active
  let silenceTimer = null; // Timer to detect silence
  let fullTranscript = ""; // Holds the entire recognized text

  /**
   * Resets the silence detection timer.
   * If no speech is detected for 10 seconds, automatically stops listening.
   * @private
   * @function
   */
  function resetSilenceTimer() {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = win.setTimeout(() => {
      // console.log("No speech for 10 seconds — stopping...");
      stopListening();
    }, 10000);
  }

  /**
   * Starts the speech recognition process.
   * Updates the start button text and output element, and resets silence timer.
   * Calling this when already listening is safe (idempotent).
   * @function
   * @returns {void}
   */
  function startListening() {
    try {
      recognition.start();
      isListening = true;
      if (startBtn) startBtn.textContent = "Stop Listening";
      if (output) output.textContent = "Listening...";
      resetSilenceTimer();
    } catch {
      // Some engines throw if already started; ignore for idempotence.
    }
  }

  /**
   * Stops the speech recognition process.
   * Updates the start button text and clears silence timer.
   * @function
   * @returns {void}
   */
  function stopListening() {
    try {
      recognition.stop();
    } finally {
      isListening = false;
      if (startBtn) startBtn.textContent = "Start Listening";
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    }
  }

  /**
   * Handles speech recognition results.
   * Updates the full transcript and the output element.
   * Automatically stops listening if the user says "done".
   * @private
   * @function
   * @param {SpeechRecognitionEvent} event - The speech recognition result event.
   */
  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ")
      .trim();

    fullTranscript = transcript;
    if (output) output.textContent = fullTranscript;

    resetSilenceTimer();

    // If user says "done", stop automatically
    if (/\bdone\b/i.test(transcript)) {
      // console.log("Heard 'done' — stopping...");
      stopListening();
    }
  };

  /**
   * Called when speech recognition ends.
   * Restarts recognition if listening was active; otherwise, marks stopped state in output.
   * @private
   * @function
   */
  recognition.onend = () => {
    if (isListening) {
      // Restart if ended unexpectedly
      recognition.start();
    } else {
      // console.log("Stopped listening.");
      if (output) output.textContent += " [Stopped]";
    }
  };
  /**
   * Handles speech recognition errors.
   * Logs the error to the console.
   * @private
   * @function
   * @param {SpeechRecognitionError} event - The speech recognition error event.
   */
  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
  };

  /**
   * Downloads the current transcript as a text file.
   * If the transcript is empty, shows an alert instead.
   * @function
   * @returns {void}
   */
//   function downloadTranscript() {
//     if (!fullTranscript.trim()) {
//       if (win.alert) win.alert("No transcript to save yet!");
//       return;
//     }

//     const blob = new Blob([fullTranscript], { type: "text/plain" });
//     const url = win.URL.createObjectURL(blob);

//     const a = doc.createElement("a");
//     a.href = url;
//     a.download = "transcript.txt";
//     doc.body.appendChild(a);
//     // Avoid opening a new tab in tests where click is stubbed
//     if (typeof a.click === "function") a.click();
//     doc.body.removeChild(a);
//     win.URL.revokeObjectURL(url);
//   }

  // === EVENT LISTENERS ===
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      if (isListening) stopListening();
      else startListening();
    });
  }

  if (doneBtn) {
    doneBtn.addEventListener("click", () => {
      stopListening();
    });
  }

  // Helpers returned for unit/integration tests
  return {
    startListening,
    stopListening,
    // downloadTranscript,
    getTranscript: () => fullTranscript,
    _getRecognition: () => recognition, // for advanced tests/mocking
  };
}
