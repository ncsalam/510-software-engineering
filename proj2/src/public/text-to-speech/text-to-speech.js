/*
  TTS browser component.

  ──────────────────────────────────────────────────────────────────────────────
  OVERVIEW
  It wires up a text-to-speech (TTS) experience around three DOM elements:
    - (Temporary) #txtfile    : <input type="file"> where the user chooses a .txt file
    - #word-box   : a container where the original text is printed while spoken
    - #audioIcon  : a logo/icon that visually "pulses" while speaking

  The code includes:
    • Dynamic loading fallback (ensurePreprocess) when preprocess is absent
    • Voice selection heuristics favouring male Italian voices
    • A pulse animation loop, boosted briefly on speech boundaries
    • Paragraph-only chunking via preprocess helpers (with identity fallback)
    • A minimal public API: { speakText, cancel }
  ──────────────────────────────────────────────────────────────────────────────
*/
import * as preprocess from "./preprocess.js";

// Runtime configuration for TTS behaviour and voice preference ordering.
const CONFIG = {
  LANG:   "it-IT",
  RATE:   1.1,
  PITCH:  1.0,
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
    "Google italiano"
  ],
  MALE_ITALIAN_NAME_HINTS: ["luca","cosimo","diego","matteo","marco","giorgio","andrea","paolo","giovanni"]
};

// Main entry point that wires the page and starts handling user interactions.
export function wirePage(win = window, doc = document) {
  // Cache the required DOM elements. These IDs must exist in the HTML.
  const fileInput = doc.getElementById("txtfile");
  const output    = doc.getElementById("word-box");
  const audioIcon = doc.getElementById("audioIcon");
  if (output) output.style.whiteSpace = "pre-wrap"; // preserve line breaks in output


  // This helper attempts to guarantee `preprocess` exists and, if not,
  // to load it dynamically or fall back to identity transforms.
  async function ensurePreprocess() {
    // If preprocess is already supplied and has the expected API, use it.
    if (preprocess && typeof preprocess.englishifyTimes === "function") return preprocess;

    // If the browser has already loaded it on `window`, adopt that instance.
    if (win.voicePreprocess && typeof win.voicePreprocess.englishifyTimes === "function") {
      preprocess = win.voicePreprocess;
      return preprocess;
    }

    // Attempt to load preprocess.js dynamically from a known relative path.
    // This is useful if the HTML forgot to include it first.
    const src = "./text-to-speech/preprocess.js";
    await new Promise((resolve, reject) => {
      const s = doc.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      doc.head.appendChild(s);
    }).catch(() => { /* swallow; we fall back below */ });

    // If dynamic load succeeded and populated window.voicePreprocess, use it.
    if (win.voicePreprocess && typeof win.voicePreprocess.englishifyTimes === "function") {
      preprocess = win.voicePreprocess;
      return preprocess;
    }

    // Final fallback: identity ops (no transforms) and a simple paragraph chunker.
    // This lets the app still function (speak the raw text) even without preprocess.
    return {
      englishifyTimes: (x) => x,
      englishifyNumbers: (x) => x,
      chunkText: (text, maxLen = 2000) => {
        const paras = String(text).replace(/\r\n/g, "\n").split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
        const out = [];
        for (const p of paras) {
          if (p.length <= maxLen) out.push(p);
          else {
            let cur = "";
            for (const t of p.split(/(\s+|,|;|:)/)) {
              if ((cur + t).length > maxLen) { if (cur.trim()) out.push(cur.trim()); cur = t.trimStart(); }
              else cur += t;
            }
            if (cur.trim()) out.push(cur.trim());
          }
        }
        return out;
      }
    };
  }
  // -----------------------------------------------------------------------

  // Visual state helper: set the icon/logo to "idle" (not speaking).
  function iconIdle(){
    if (!audioIcon) return;
    audioIcon.classList.remove("speaking");
    audioIcon.style.transform = "";
  }
  // Visual state helper: mark the icon/logo as "speaking".
  function iconSpeaking(){
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
      const now = (win.performance && win.performance.now) ? win.performance.now() : Date.now();
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
    if (pulseTimer) { clearTimeout(pulseTimer); pulseTimer = null; }
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
  function populateVoices() {
    voices = win.speechSynthesis.getVoices();
    selectedVoice = pickVoice(voices, CONFIG.VOICE_PREFER);
  }
  // Try preferred names first, then Italian male-ish names, then any Italian, then any voice at all.
  function pickVoice(list, preferred) {
    for (const name of preferred) {
      const v = list.find(v => v.name === name);
      if (v) return v;
    }
    const maleRe = new RegExp(`\\b(${CONFIG.MALE_ITALIAN_NAME_HINTS.join("|")})\\b`, "i");
    const maleIt = list.find(v => v.lang && v.lang.toLowerCase().startsWith("it") && maleRe.test(v.name));
    if (maleIt) return maleIt;
    const anyIt = list.find(v => v.lang && v.lang.toLowerCase().startsWith("it"));
    if (anyIt) return anyIt;
    return list[0] || null;
  }
  populateVoices();                     // initial grab
  win.speechSynthesis.onvoiceschanged = populateVoices; // refresh when voices change (e.g., async load)

  // Handle user selecting a .txt file: read it, preprocess, display, and speak.
  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Be lenient on MIME type (some browsers leave it empty); block obvious non-text.
      if (file.type && file.type !== "text/plain") {
        if (output) output.textContent = `"${file.name}" is not plain text. Please choose a .txt file.`;
        return;
      }

      cancel(); // stop any current reading session

      // Read file contents; if reading fails, report and bail.
      let original;
      try {
        original = normalizeWhitespace(await readFileText(file));
      } catch {
        if (output) output.textContent = "Failed to read file.";
        return;
      }

      // Ensure we have preprocess helpers, then apply: times → numbers.
      const transformed = preprocess.englishifyNumbers(preprocess.englishifyTimes(original));

      // Speak the transformed text while printing the original text.
      startSpeaking(transformed, original);
    });
  }

  // Prepare a new speaking session: reset state and compute paragraph chunks.
  function startSpeaking(spokenText, originalText) {
    try { win.speechSynthesis.cancel(); } catch {}
    isSpeaking = true;
    printedSoFar = "";

    chunks = preprocess.chunkText(spokenText,   CONFIG.CHUNK_LEN);
    originalChunks = preprocess.chunkText(originalText, CONFIG.CHUNK_LEN);
    idx = 0;
    iconSpeaking();
    if (output) output.textContent = "";
    speakNext();
  }

  // Speak one chunk, print its original paragraph, then chain to the next chunk.
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
      utter.lang  = selectedVoice.lang || CONFIG.LANG;
    } else {
      utter.lang = CONFIG.LANG;
    }
    utter.rate   = CONFIG.RATE;
    utter.pitch  = CONFIG.PITCH;
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
      const now = (win.performance && win.performance.now) ? win.performance.now() : Date.now();
      boundaryBoostUntil = now + 350;
    };
    // On finish or error: stop pulsing and move on to the next paragraph.
    utter.onend = () => { stopPulseLoop(); idx += 1; speakNext(); };
    utter.onerror = () => { stopPulseLoop(); idx += 1; speakNext(); };

    // Queue the utterance with the browser TTS engine.
    win.speechSynthesis.speak(utter);
  }

  // Immediately cancel any ongoing speech and reset visual state.
  function cancel() {
    isSpeaking = false;
    try { win.speechSynthesis.cancel(); } catch {}
    stopPulseLoop();
    iconIdle();
  }

  // Read a File object as text (wrapped in a Promise for async/await ergonomics).
  function readFileText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload  = () => resolve(String(reader.result || ""));
      reader.readAsText(file);
    });
  }
  // Normalize line endings and collapse excessive whitespace while preserving paragraphs.
  function normalizeWhitespace(s) {
    return s.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ");
  }
  // Append plain text to the printed output buffer and reflect it in the DOM.
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
