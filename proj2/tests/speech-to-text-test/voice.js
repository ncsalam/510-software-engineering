// voice.js
let isListening = false;
let fullTranscript = "";
let silenceTimer = null;

function startListening(recognition, startBtn, output, resetSilenceTimerFn) {
  recognition.start();
  isListening = true;
  startBtn.textContent = "Stop Listening";
  output.textContent = "Listening...";
  resetSilenceTimerFn();
}

function stopListening(recognition, startBtn, clearTimeoutFn) {
  recognition.stop();
  isListening = false;
  startBtn.textContent = "Start Listening";
  clearTimeoutFn(silenceTimer);
}

function updateTranscript(transcript, outputEl) {
  fullTranscript = transcript;
  outputEl.textContent = fullTranscript;
  return fullTranscript;
}

function downloadTranscript(fullTranscript, createObjectURLFn, appendChildFn, removeChildFn, revokeURLFn) {
  if (!fullTranscript.trim()) return false;
  const blob = { type: "text/plain", data: fullTranscript };
  const url = createObjectURLFn(blob);
  const a = { href: url, download: "transcript.txt" };
  appendChildFn(a);
  removeChildFn(a);
  revokeURLFn(url);
  return true;
}

module.exports = { startListening, stopListening, updateTranscript, downloadTranscript };
