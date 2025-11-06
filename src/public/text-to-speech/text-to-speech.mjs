/**
 * Text-to-Speech (TTS) browser component and helpers.
 *
 * This module wires a lightweight TTS experience into a page by hooking
 * two DOM elements: `#word-box` (where original (unprocessed) text paragraphs 
 * are shown while spoken), and `#audioIcon` (a small visual icon that pulses while speaking).
 *
 * The implementation focuses on producing natural spoken output by:
 *  - expanding numbers, currencies and times via `preprocess` helpers;
 *  - picking a suitable voice (preference list + heuristics);
 *  - chunking text into paragraph-sized pieces for readable TTS playback;
 *  - providing a small, test-friendly public API: `{ speakText, cancel }`.
 *
 *
 * @module src/public/text-to-speech/text-to-speech
 */
import * as preprocess from "./preprocess.mjs";

/**
 * Runtime configuration for TTS behaviour and voice preference ordering.
 *
 * These values control language, playback parameters and heuristics used to
 * select a preferred voice.
 *
 * @constant {Object}
 * @property {string} LANG - default language tag used when a voice is not set
 * @property {number} RATE - speech rate multiplier
 * @property {number} PITCH - speech pitch multiplier
 * @property {number} VOLUME - speech volume (0..1)
 * @property {number} CHUNK_LEN - maximum paragraph character length to send to TTS at a time.
 * @property {string[]} VOICE_PREFER - preferred voice names (in order)
 * @property {string[]} MALE_ITALIAN_NAME_HINTS - tokens used to detect male Italian voices
 */
const CONFIG = {
  LANG: "it-IT",
  RATE: 1.1,
  PITCH: 1.0,
  VOLUME: 1.0,
  CHUNK_LEN: 2000,
  VOICE_PREFER: [
    "Luca",
    "Microsoft Cosimo Online (Natural) - Italian (Italy)",
    "Microsoft Diego Online (Natural) - Italian (Italy)",
    "Microsoft Matteo Online (Natural) - Italian (Italy)",
    "Microsoft Cosimo - Italian (Italy)",
    "Microsoft Diego - Italian (Italy)",
    "Microsoft Matteo - Italian (Italy)",
    "Google italiano",
  ],
  MALE_ITALIAN_NAME_HINTS: ["luca", "cosimo", "diego", "matteo", "marco", "giorgio", "andrea", "paolo", "giovanni"],
};

/**
 * Wire the page with TTS behavior and return a minimal, testable API.
 *
 * This function looks up the expected DOM elements (if present), detects
 * browser TTS support, selects an appropriate voice, and exposes two
 * functions: `speakText(spokenText, originalText)` which begins a TTS
 * session, and `cancel()` which immediately stops any ongoing speech.
 *
 * The returned API is intentionally small to make unit testing easy: the
 * implementation performs DOM updates and calls into the Web Speech API
 * but tests can call `speakText` directly to exercise the chunking and
 * output behavior.
 *
 * @export
 * @param {Window} [win=window] - window-like object
 * @param {Document} [doc=document] - document-like object
 * @returns {{ speakText: (spokenText: string, originalText: string) => void, cancel: () => void }} public API
 */
export function wirePage(win = window, doc = document) {
  // Cache the required DOM elements. These IDs must exist in the HTML.
  const output = doc.getElementById("word-box");
  const audioIcon = doc.getElementById("audioIcon");
  if (output) output.style.whiteSpace = "pre-wrap"; // preserve line breaks in output

  // Visual state helper: set the icon/logo to "idle" (not speaking).
  function iconIdle() {
    if (!audioIcon) return;
    audioIcon.classList.remove("speaking");
    audioIcon.style.transform = "";
  }
  // Visual state helper: mark the icon/logo as "speaking".
  function iconSpeaking() {
    if (!audioIcon) return;
    audioIcon.classList.add("speaking");
  }

  // Pulse animation state to create a natural, irregular "talking" glow.
  let pulseTimer = null;
  let boundaryBoostUntil = 0;

  // Trigger one short pulse burst on the icon.
  function pulseOnce() {
    if (!audioIcon) return;
    audioIcon.classList.add("pulse-burst");
    setTimeout(() => audioIcon && audioIcon.classList.remove("pulse-burst"), 140);
  }
  // Start the looping jittered pulse; becomes faster for a short time after boundaries.
  function startPulseLoop() {
    stopPulseLoop();
    const loop = () => {
      const now = win.performance && win.performance.now ? win.performance.now() : Date.now();
      const boosted = now < boundaryBoostUntil;
      const minDelay = boosted ? 120 : 220;
      const maxDelay = boosted ? 360 : 520;
      const jitter = Math.random() * (maxDelay - minDelay) + minDelay;
      pulseOnce();
      pulseTimer = win.setTimeout(loop, jitter);
    };
    loop();
  }
  // Stop the pulse loop cleanly.
  function stopPulseLoop() {
    if (pulseTimer) {
      clearTimeout(pulseTimer);
      pulseTimer = null;
    }
  }

  // Detect Web Speech API.
  const supportsTTS = "speechSynthesis" in win && "SpeechSynthesisUtterance" in win;
  if (!supportsTTS) {
    if (output) output.textContent = "Web Speech Synthesis not supported in this browser.";
    return { speakText: () => {}, cancel: () => {} };
  }

  // Core, long-lived state used across reading sessions.
  let voices = [];
  let selectedVoice = null;
  let isSpeaking = false;
  let chunks = [];
  let originalChunks = [];
  let idx = 0;
  let printedSoFar = "";

  // Refresh the voice list and pick a preferred one based on the config.
  /**
   * Refresh local `voices` from the Web Speech API and pick a preferred voice.
   *
   * This should be called initially and also in response to the
   * `onvoiceschanged` event since browsers may load voices asynchronously.
   */
  function populateVoices() {
    voices = win.speechSynthesis.getVoices();
    selectedVoice = pickVoice(voices, CONFIG.VOICE_PREFER);
  }
  // Try preferred names first, then Italian male-ish names, then any Italian, then any voice at all.
  /**
   * Choose a voice from the provided list using heuristics.
   *
   * Order of preference:
   * 1. Exact matches for configured names in `preferred`.
   * 2. Italian-language voices whose name contains common male name hints.
   * 3. Any Italian-language voice.
   * 4. The first available voice.
   *
   * @param {SpeechSynthesisVoice[]} list - available voices
   * @param {string[]} preferred - ordered list of preferred voice names
   * @returns {SpeechSynthesisVoice|null} chosen voice or null
   */
  function pickVoice(list, preferred) {
    for (const name of preferred) {
      const v = list.find((v) => v.name === name);
      if (v) return v;
    }
    const maleRe = new RegExp(`\\b(${CONFIG.MALE_ITALIAN_NAME_HINTS.join("|")})\\b`, "i");
    const maleIt = list.find((v) => v.lang && v.lang.toLowerCase().startsWith("it") && maleRe.test(v.name));
    if (maleIt) return maleIt;
    const anyIt = list.find((v) => v.lang && v.lang.toLowerCase().startsWith("it"));
    if (anyIt) return anyIt;
    return list[0] || null;
  }
  populateVoices(); // initial grab
  win.speechSynthesis.onvoiceschanged = populateVoices; // refresh when voices change (e.g., async load)

  /**
   * Start speaking the provided text.
   *
   * This prepares chunked paragraphs for TTS, resets printed state and
   * begins the speaking chain by calling `speakNext`.
   *
   * @param {string} spokenText - text that will be sent to the TTS engine
   * @param {string} originalText - original/unmodified text shown in the UI
   */
  // Prepare a new speaking session: reset state and compute paragraph chunks.
  function startSpeaking(spokenText, originalText) {
    try {
      win.speechSynthesis.cancel();
    } catch {}
    isSpeaking = true;
    printedSoFar = "";

    chunks = preprocess.chunkText(spokenText, CONFIG.CHUNK_LEN);
    originalChunks = preprocess.chunkText(originalText, CONFIG.CHUNK_LEN);
    idx = 0;
    iconSpeaking();
    if (output) output.textContent = "";
    speakNext();
  }

  /**
   * Speak the next chunk in the queue.
   *
   * This function constructs a SpeechSynthesisUtterance for the current
   * chunk, wires onstart/onboundary/onend/onerror handlers to update the
   * UI and pulse animation, and then calls `speechSynthesis.speak`.
   *
   * Note: if a `selectedVoice` was chosen, it will be assigned to
   * `utter.voice`. The `utter.lang` is intentionally set from
   * `CONFIG.LANG` to provide a consistent language tag for the utterance.
   */
  function speakNext() {
    if (!isSpeaking) return;
    if (idx >= chunks.length) {
      isSpeaking = false;
      stopPulseLoop();
      iconIdle();
      return;
    }

    // Configure the utterance with the selected voice + playback settings.
    const utter = new SpeechSynthesisUtterance(chunks[idx]);
    if (selectedVoice) {
      utter.voice = selectedVoice;
    }

    // Always set the utterance language to the configured LANG. When a
    // voice is provided the browser typically uses the voice's native
    // characteristics; LANG helps the speech engine choose pronunciation
    // rules when needed.
    utter.lang = CONFIG.LANG;
    utter.rate = CONFIG.RATE;
    utter.pitch = CONFIG.PITCH;
    utter.volume = CONFIG.VOLUME;

    // On start: show as speaking, begin pulsing, and print the original paragraph.
    utter.onstart = () => {
      iconSpeaking();
      startPulseLoop();
      if (output && originalChunks[idx]) {
        if (printedSoFar && !/\n\n$/.test(printedSoFar)) appendToOutput("\n\n");
        appendToOutput(originalChunks[idx]);
      }
    };
    // On boundaries: add a quick pulse burst and momentarily speed up the pulse loop.
    utter.onboundary = () => {
      pulseOnce();
      const now = win.performance && win.performance.now ? win.performance.now() : Date.now();
      boundaryBoostUntil = now + 350;
    };
    // On finish or error: stop pulsing and move on to the next paragraph.
    utter.onend = () => {
      stopPulseLoop();
      idx += 1;
      speakNext();
    };
    utter.onerror = () => {
      stopPulseLoop();
      idx += 1;
      speakNext();
    };

    // Queue the utterance with the browser TTS engine.
    win.speechSynthesis.speak(utter);
  }

  /**
   * Cancels speech.
   *
   * Attempts to cancel speech and set logo back to idle state.
   */

  // Immediately cancel any ongoing speech and reset visual state.
  function cancel() {
    isSpeaking = false;
    try {
      win.speechSynthesis.cancel();
    } catch {}
    stopPulseLoop();
    iconIdle();
  }

  /**
   * Append non-processed text to the printed output buffer and reflect it in the DOM.
   *
   * Maintains an internal `printedSoFar` buffer and updates `#word-box` when
   * present. Empty input is ignored.
   *
   * @param {string} s - text to append to the UI output
   */
  function appendToOutput(s) {
    if (!s) return;
    printedSoFar += s;
    if (output) output.textContent = printedSoFar;
  }

  // Set the icon to its initial non-speaking state on page wire-up.
  iconIdle();

  // Public API: allows tests (or other code) to drive speech manually.
  return { speakText: startSpeaking, cancel };
}
