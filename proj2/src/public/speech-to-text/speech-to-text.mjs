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
  let isListening = false;
  let silenceTimer = null;
  let fullTranscript = "";

  function resetSilenceTimer() {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = win.setTimeout(() => stopListening(), 10000);
  }

  function startListening() {
    try {
      recognition.start();
      isListening = true;
      if (startBtn) startBtn.textContent = "Stop Listening";
      if (output) output.textContent = "Listening...";
      resetSilenceTimer();
    } catch {
      // ignore errors if already started
    }
  }

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

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ")
      .trim();

    fullTranscript = transcript;
    if (output) output.textContent = fullTranscript;

    resetSilenceTimer();

    if (/\bdone\b/i.test(transcript)) stopListening();
  };

  recognition.onend = () => {
    if (isListening) recognition.start();
    else if (output) output.textContent += " [Stopped]";
  };

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
    if (typeof a.click === "function") a.click();
    doc.body.removeChild(a);
    win.URL.revokeObjectURL(url);
  }

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

  return {
    startListening,
    stopListening,
    downloadTranscript,
    getTranscript: () => fullTranscript,
    _getRecognition: () => recognition,
  };
}
