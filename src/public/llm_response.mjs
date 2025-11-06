/**
 * LLM response wiring for the demo page.
 *
 * This module wires Speech-To-Text (STT) and Text-To-Speech (TTS) helpers
 * together with a small server API. Flow summary:
 *  - wire STT/TTS page helpers (they expose small APIs like `getTranscript`,
 *    `speakText` and `cancel`)
 *  - initialize a server-side chat with POST /api/chat (receives `{id}`)
 *  - Posts transcripts on 'done' button click event to POST /api/chat/:id and speak the returned
 *    reply after running light preprocessing (times/numbers)
 *
 * @module src/public/llm_response
 */

import { wirePage as wirePageSTT } from "./speech-to-text/speech-to-text.mjs";
import { wirePage as wirePageTTS } from "./text-to-speech/text-to-speech.mjs";
import * as preprocess from "./text-to-speech/preprocess.mjs";

/**
 * Chat id for the current browser tab.
 *
 * Set after POST /api/chat returns `{ id }`. `null` indicates init has not
 * completed or failed.
 *
 * @type {number|null}
 */
let chatId = null;

/**
 * Post a transcript to the server LLM endpoint and return the raw reply.
 *
 * Behavior:
 *  - updates the `#word-box` element to show a temporary "You said...\n\nThinking..."
 *  - POSTs JSON { message: transcript } to `/api/chat/{chatId}` and expects
 *    a JSON response of shape `{ response: string }`.
 *  - on network or server errors it logs the error and returns the
 *    fallback string "[Error] Could not reach the server." and updates the UI.
 *
 * @param {string} transcript - user transcript text to send
 * @param {Document} doc - document used to look up the `#word-box` element
 * @returns {Promise<string>} resolved LLM reply (or error placeholder)
 */
async function sendTranscriptToLLM(transcript, doc) {
  const wordBox = doc.getElementById("word-box");

  if (wordBox) {
    wordBox.textContent = `You said:\n\n${transcript}\n\nThinking...`;
  }

  // POST transcript to server; expects { response: "..." }
  let llmReply = "";
  try {
    const res = await fetch(`/api/chat/${chatId}`, { 
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: transcript }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`POST /api/chat/${chatId} failed: ${res.status} ${res.statusText}\n${body}`);
    }

    const json = await res.json();
    llmReply = json.response;
  } catch (err) {
    console.warn(err);
    llmReply = "[Error] Could not reach the server.";
  }

  // Print the reply immediately
  if (wordBox) wordBox.textContent = llmReply;

  return llmReply;
}

/**
 * Wire STT/TTS helpers and perform chat initialization once the DOM is ready.
 *
 * Expected shapes:
 *  - STT helper (`wirePage`) returns { getTranscript: () => string, ... }
 *  - TTS helper (`wirePage`) returns { speakText: (spoken, raw) => void, cancel: () => void }
 *
 * The flow here:
 *  1. disable the Done button until POST /api/chat returns a chat id
 *  2. wire Done click to post transcript from STT component, preprocess the reply, and speak it
 *  3. wire start button and beforeunload to cancel any ongoing TTS
 */
document.addEventListener("DOMContentLoaded", async () => {
  // Wire up STT/TTS and capture their tiny APIs
  const stt = wirePageSTT(window, document);
  const tts = wirePageTTS(window, document);

  // Handle the “Done / Save Transcript” button and "Start Listening" button
  const doneBtn = document.getElementById("done");
  const startBtn = document.getElementById("start");

  // Disable until chat is ready
  if (doneBtn) doneBtn.disabled = true;

  // Initialize chat once per tab
  try {
    const res = await fetch("/api/chat", { method: "POST" });
    if (!res.ok) throw new Error(`chat init failed: ${res.status}`);
    const json = await res.json();
    chatId = json.id;
  } catch (e) {
    console.warn(e);
    const wordBox = document.getElementById("word-box");
    if (wordBox) wordBox.textContent = "Failed to initialize chat. Please refresh.";
    // Keep button disabled if init failed
    return;
  } finally {
    // enable when ready
    if (doneBtn && chatId) doneBtn.disabled = false; 
  }

  //Cancel TTS on new STT input.
  if (startBtn && tts) {
    startBtn.addEventListener("click", () => {
      tts.cancel();
    });
  }

  // Cancel TTS on page refresh/close
  if (tts) {
    window.addEventListener("beforeunload", () => {
      tts.cancel();
    });
  }

  if (doneBtn) {
    doneBtn.addEventListener("click", async () => {
      // Get transcript from stt API.
      const transcript = stt.getTranscript();

      if (!transcript) return;

      const llmReply = await sendTranscriptToLLM(transcript, document);

      // Preprocess the reply so it’s spoken naturally
      const spoken = preprocess.englishifyNumbers(preprocess.englishifyTimes(llmReply));

      // Cancel previous speech, speak text and also show the unmodified text in the UI
      tts.cancel();
      tts.speakText(spoken, llmReply);
    });
  }
});
