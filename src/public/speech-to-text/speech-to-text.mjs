/**
 * Wire up SpeechRecognition and the page controls.
 * Expects the following elements (by id) if present:
 *   - #start  : button to toggle start/stop listening
 *   - #done   : button to stop and download transcript
 *   - #output : <p>/<div> to show live transcript
 *
 * @param {Window}  win
 * @param {Document} doc
 * @returns
 *   startListening: Function,
 *   stopListening: Function,
 *   downloadTranscript: Function,
 *   getTranscript: Function,
 *   _getRecognition: Function
 */

/**
 * Wires the page: attaches event listeners and sets up SpeechRecognition.
 * @param {Window} win
 * @param {Document} doc
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
      downloadTranscript: () => {},
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
   * Resets silence detection timer (10 seconds of inactivity stops listening)
   */
  function resetSilenceTimer() {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = win.setTimeout(() => {
      // console.log("No speech for 10 seconds — stopping...");
      stopListening();
    }, 10000);
  }

  /**
   * Starts the speech recognition process
   */
  function startListening() {
    try {
      recognition.start();
      isListening = true;
      if (startBtn) startBtn.textContent = "Stop Listening";
      if (output) output.textContent = "Listening...";
      resetSilenceTimer();
    } catch (e) {
      // Some engines throw if already started; ignore for idempotence.
    }
  }

  /**
   * Stops the speech recognition process
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
   * Handles recognized speech input (both interim and final)
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
   * Called when recognition ends (manually or automatically)
   */
  recognition.onend = () => {
    if (isListening) {
      // Restart if ended unexpectedly
      try {
        recognition.start();
      } catch {}
    } else {
      // console.log("Stopped listening.");
      if (output) output.textContent += " [Stopped]";
    }
  };

  recognition.onerror = (event) => {
    // console.error("Speech recognition error:", event.error);
  };

  /**
   * Downloads the transcript as a text (.txt) file
   */
  function downloadTranscript() {
    if (!fullTranscript.trim()) {
      if (win.alert) win.alert("No transcript to save yet!");
      return;
    }

    const blob = new Blob([fullTranscript], { type: "text/plain" });
    const url = win.URL.createObjectURL(blob);

    const a = doc.createElement("a");
    a.href = url;
    a.download = "transcript.txt";
    doc.body.appendChild(a);
    // Avoid opening a new tab in tests where click is stubbed
    if (typeof a.click === "function") a.click();
    doc.body.removeChild(a);
    win.URL.revokeObjectURL(url);
  }

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
      downloadTranscript();
    });
  }

  // Helpers returned for unit/integration tests
  return {
    startListening,
    stopListening,
    downloadTranscript,
    getTranscript: () => fullTranscript,
    _getRecognition: () => recognition, // for advanced tests/mocking
  };
}
