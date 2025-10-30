import { wirePage as wirePageSTT } from "./speech-to-text/speech-to-text.mjs";
import { wirePage as wirePageTTS } from "./text-to-speech/text-to-speech.mjs";
import * as preprocess from "./text-to-speech/preprocess.mjs";

function getTranscriptFromDOM(doc) {
  // Fallback: read what STT prints into #output if the STT API isn’t available
  const el = doc.getElementById("output");
  return (el?.textContent || "").trim();
}

async function sendTranscriptToLLM(transcript, doc) {
  const wordBox = doc.getElementById("word-box");

  if (wordBox) {
    wordBox.textContent = `You said:\n\n${transcript}\n\nThinking...`;
  }

  // POST transcript to server; expects { response: "..." }
  let llmReply = "";
  try {
    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: transcript }),
    });
    const data = await res.json();
    llmReply = data?.response || "";
  } catch (err) {
    llmReply = "[Error] Could not reach the server.";
  }

  // Print the reply immediately
  if (wordBox) wordBox.textContent = llmReply;

  return llmReply;
}

document.addEventListener("DOMContentLoaded", () => {
  // Wire up STT/TTS and capture their tiny APIs
  const stt = wirePageSTT?.(window, document) || null;
  const tts = wirePageTTS?.(window, document) || null;

  // Handle the “Done / Save Transcript” button:
  const doneBtn = document.getElementById("done");
  if (doneBtn) {
    doneBtn.addEventListener("click", async () => {
      // Prefer API from STT; otherwise, fall back to the #output element
      const transcript =
        (stt && typeof stt.getTranscript === "function"
          ? stt.getTranscript()
          : getTranscriptFromDOM(document)) || "";

      if (!transcript) return;

      const llmReply = await sendTranscriptToLLM(transcript, document);

      // Preprocess the reply so it’s spoken naturally
      const spoken = preprocess.englishifyNumbers(preprocess.englishifyTimes(llmReply));

      // Cancel previous speech, speak text and also show the unmodified text in the UI
      tts?.cancel?.();
      tts?.speakText?.(spoken, llmReply);
    });
  }
});