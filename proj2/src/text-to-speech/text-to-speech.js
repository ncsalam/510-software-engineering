/* UMD wrapper: CommonJS (Node/Jest) + browser global (window.tts) */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.voiceAppTTS = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {

  // Config settings
  const CONFIG = {
    LANG:   "it-IT",           // prefer Italian voice catalog
    RATE:   1.1,               // 0.1–10
    PITCH:  1.0,               // 0–2
    VOLUME: 1.0,               // 0–1
    CHUNK_LEN: 2000,
    // List of potential voices for pickVoice function.
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
    // best-effort male name hints for fallback
    MALE_ITALIAN_NAME_HINTS: ["luca","cosimo","diego","matteo","marco","giorgio","andrea","paolo","giovanni"]
  };

  /**
   * Attach handlers; speak when a .txt file is chosen.
   * @param {Window} win
   * @param {Document} doc
   */
  function wirePage(win = window, doc = document) {
    const fileInput = doc.getElementById("txtfile");
    const output    = doc.getElementById("word-box");
    const audioIcon = doc.getElementById("audioIcon");

    // Ensure line breaks render in word-box
    if (output) output.style.whiteSpace = "pre-wrap";

    // Audio icon/logo helper functions
    function iconIdle(){
      if (!audioIcon) return;
      audioIcon.classList.remove("speaking");
      audioIcon.style.transform = "";
    }
    function iconSpeaking(){
      if (!audioIcon) return;
      audioIcon.classList.add("speaking");
    }

    // --- Irregular pulsing state & helpers ---
    let pulseTimer = null;
    let boundaryBoostUntil = 0;

    function pulseOnce() {
      if (!audioIcon) return;
      audioIcon.classList.add("pulse-burst");
      setTimeout(() => audioIcon && audioIcon.classList.remove("pulse-burst"), 140);
    }

    function startPulseLoop() {
      stopPulseLoop(); // safety
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

    function stopPulseLoop() {
      if (pulseTimer) {
        clearTimeout(pulseTimer);
        pulseTimer = null;
      }
    }

    const supportsTTS = "speechSynthesis" in win && "SpeechSynthesisUtterance" in win;
    if (!supportsTTS) {
      if (output) output.textContent = "Web Speech Synthesis not supported in this browser.";
      return { speakText: () => {}, cancel: () => {} };
    }

    // --- State ---
    let voices = [];
    let selectedVoice = null;
    let isSpeaking = false;
    let chunks = [];           // Spoken (processed) paragraphs for reading
    let originalChunks = [];   // Original paragraphs from text (for printing)
    let idx = 0;

    // --- streaming state (plain text, no highlight) ---
    let spokenSoFar = "";   // everything already appended to output

    // Populate voices (async on some browsers)
    function populateVoices() {
      voices = win.speechSynthesis.getVoices();
      selectedVoice = pickVoice(voices, CONFIG.VOICE_PREFER);
    }
    // voice picker with Italian + male-ish fallback
    function pickVoice(list, preferred) {
      // 1) exact hardcoded names first
      for (const name of preferred) {
        const v = list.find(v => v.name === name);
        if (v) return v;
      }
      // 2) any Italian voice whose name looks male (best-effort)
      const maleRe = new RegExp(`\\b(${CONFIG.MALE_ITALIAN_NAME_HINTS.join("|")})\\b`, "i");
      const maleIt = list.find(v => v.lang && v.lang.toLowerCase().startsWith("it") && maleRe.test(v.name));
      if (maleIt) return maleIt;

      // 3) any Italian voice
      const anyIt = list.find(v => v.lang && v.lang.toLowerCase().startsWith("it"));
      if (anyIt) return anyIt;

      // 4) last resort: anything
      return list[0] || null;
    }
    populateVoices();
    win.speechSynthesis.onvoiceschanged = populateVoices;

    // --- File load handler ---
    if (fileInput) {
      fileInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type && file.type !== "text/plain") {
          say(`"${file.name}" is not plain text. Please choose a .txt file.`);
          return;
        }
        // Cancel current speech if any
        cancel();

        try {
          const original = normalizeWhitespace(await readFileText(file));   // Minimally processed text for visual output
          // Process TIMES first, then numbers/currency/percent for audio only
          const spoken   = englishifyNumbers( englishifyTimes(original) );
          const len = original.length.toLocaleString();
          say(`Loaded ${file.name} (${len} chars)\n\nStarting speech…`);

          // start speaking
          startSpeaking(spoken, original);
        } catch (err) {
          say("Failed to read file.");
        }
      });
    }

    // --- Speaking pipeline ---
    function startSpeaking(spokenText, originalText) {
      try { win.speechSynthesis.cancel(); } catch {}
      isSpeaking = true;
      spokenSoFar = "";
      chunks = chunkText(spokenText,   CONFIG.CHUNK_LEN);        // audio paragraphs
      originalChunks = chunkText(originalText, CONFIG.CHUNK_LEN); // UI paragraphs
      idx = 0;
      iconSpeaking();
      if (output) output.textContent = "";
      speakNext();
    }

    function speakNext() {
      if (!isSpeaking) return;
      if (idx >= chunks.length) {
        isSpeaking = false;
        appendStatus("\n\nDone.");
        stopPulseLoop();
        iconIdle();
        return;
      }

      const utter = new SpeechSynthesisUtterance(chunks[idx]);
      if (selectedVoice) {
        utter.voice = selectedVoice;
        // Speak using the voice's own locale (fallback to CONFIG.LANG)
        utter.lang  = selectedVoice.lang || CONFIG.LANG;
      } else {
        utter.lang = CONFIG.LANG;
      }
      utter.rate   = CONFIG.RATE;
      utter.pitch  = CONFIG.PITCH;
      utter.volume = CONFIG.VOLUME;

      utter.onstart = () => {
        replaceFirstLine(`Speaking paragraph ${idx + 1} of ${chunks.length}…`);
        iconSpeaking();
        // iconThump(); // no longer used; continuous irregular pulsing instead
        startPulseLoop();

        // Print the original paragraph immediately (keeps numerals & symbols unchanged)
        if (output && originalChunks[idx]) {
          if (spokenSoFar && !/\n\n$/.test(spokenSoFar)) appendToOutput("\n\n");
          appendToOutput(originalChunks[idx]);
        }
      };

      // Irregular micro-bursts on boundaries when supported
      utter.onboundary = () => {
        pulseOnce();
        const now = (win.performance && win.performance.now) ? win.performance.now() : Date.now();
        boundaryBoostUntil = now + 350;
      };

      utter.onend = () => {
        stopPulseLoop();
        idx += 1;
        speakNext(); // immediate handoff
      };

      utter.onerror = () => {
        stopPulseLoop();
        idx += 1;
        speakNext();
      };

      win.speechSynthesis.speak(utter);
    }

    function cancel() {
      isSpeaking = false;
      try { win.speechSynthesis.cancel(); } catch {}
      appendStatus("\n\n[Canceled]");
      stopPulseLoop();
      iconIdle();
    }

    // --- Utilities ---
    function readFileText(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload  = () => resolve(String(reader.result || ""));
        reader.readAsText(file);
      });
    }

    function normalizeWhitespace(s) {
      return s.replace(/\r\n/g, "\n")
              .replace(/[ \t]+\n/g, "\n")
              .replace(/[ \t]{2,}/g, " ");
    }

    // === Times -> words (audio only) ===
    function englishifyTimes(s) {
      let out = s;

      // 1) HH:MM AM/PM (with optional spaces and periods)
      out = out.replace(
        /\b(\d{1,2}):([0-5]\d)\s*([AaPp])\.?\s*[Mm]\.?\b/g,
        (_, h, m, ap) => timeToWords(h, m, ap)
      );

      // 2) HH AM/PM (no minutes)
      out = out.replace(
        /\b(\d{1,2})\s*([AaPp])\.?\s*[Mm]\.?\b/g,
        (_, h, ap) => timeToWords(h, null, ap)
      );

      return out;
    }

    function timeToWords(hStr, mStr, apLetter) {
      let h = Number(hStr);
      let m = mStr == null ? null : Number(mStr);
      const ap = String(apLetter).toLowerCase() === 'p' ? 'pm' : 'am';

      // Normalize hour to 12-hour clock for speech
      h = ((h % 12) || 12);

      const hourWords = numberToWordsUnderBillion(h);
      let spoken;

      if (m == null) {
        // "7 PM" -> "seven pm"
        spoken = `${hourWords} ${ap}`;
      } else if (m === 0) {
        // "10:00 PM" -> "ten o'clock pm"
        spoken = `${hourWords} o'clock ${ap}`;
      } else if (m < 10) {
        // "3:05 am" -> "three oh five am"
        spoken = `${hourWords} oh ${numberToWordsUnderBillion(m)} ${ap}`;
      } else {
        // "12:30 p.m." -> "twelve thirty pm"
        spoken = `${hourWords} ${numberToWordsUnderBillion(m)} ${ap}`;
      }
      return spoken;
    }

    // Convert numerals/currency/percentages to English pronunciation (audio only)
    function englishifyNumbers(s) {
      let out = s;

      // 1) Dollar amounts (handle "-$123.45", "$-123.45", "$1,234", "$19.99")
      out = out.replace(/-?\s*\$-?\s*\d[\d,]*(?:\.\d+)?/g, (m) => {
        const negative = /-/.test(m);
        const numeric = m.replace(/[^0-9.]/g, ""); // drop $ , spaces, minus
        const words = dollarsToWords(numeric);
        return (negative ? "minus " : "") + words;
      });

      // 2) Percentages (handle "-12.5%", "7%", "1,200%")
      out = out.replace(/-?\s*\d[\d,]*(?:\.\d+)?\s*%/g, (m) => {
        const negative = /^\s*-/.test(m);
        const numeric = m.replace(/[^\d.]/g, "").replace(/,/g, "");
        let words;
        if (numeric.includes(".")) {
          const [i, f] = numeric.split(".");
          const intWords = intToWordsSafe(i);
          const fracWords = f.split("").map(d => digitWord(d)).join(" ");
          words = `${intWords} point ${fracWords} percent`;
        } else {
          words = `${intToWordsSafe(numeric)} percent`;
        }
        return (negative ? "minus " : "") + words;
      });

      // 3) Remaining numbers (integers/decimals)
      out = out.replace(/(?<![A-Za-z])\d[\d,\.]*\d|\b\d\b/g, (numStr) => {
        const hasDot = numStr.includes(".");
        const hasComma = numStr.includes(",");
        let cleaned = numStr;
        if (hasComma && (!hasDot || /\d,\d{3}(\D|$)/.test(numStr))) {
          cleaned = cleaned.replace(/,/g, "");
        }
        if (cleaned.includes(".")) {
          const [intPart, fracPart] = cleaned.split(".");
          const intWords = intToWordsSafe(intPart);
          const fracWords = (fracPart || "").split("").map(d => digitWord(d)).join(" ");
          return fracPart ? `${intWords} point ${fracWords}` : intWords;
        } else {
          return intToWordsSafe(cleaned);
        }
      });

      return out;
    }

    // Convert dollar amounts to the English verbal equivalent
    function dollarsToWords(numeric) {
      // normalize like "1,234.50" -> "1234.50"
      const [intPartRaw, fracRaw] = numeric.split(".");
      const intPart = (intPartRaw || "0").replace(/^0+(?!$)/, "");
      let cents = Math.round(Number("0." + (fracRaw || "0")) * 100);
      let dollars = Number(intPart || "0");
      if (cents === 100) { dollars += 1; cents = 0; }

      const dWords = numberToWordsUnderBillion(dollars);
      const dUnit  = dollars === 1 ? "dollar" : "dollars";

      if (cents > 0) {
        const cWords = numberToWordsUnderBillion(cents);
        const cUnit  = cents === 1 ? "cent" : "cents";
        if (dollars > 0) return `${dWords} ${dUnit} and ${cWords} ${cUnit}`;
        return `${cWords} ${cUnit}`;
      }
      return `${dWords} ${dUnit}`;
    }

    // integer to words (English), safe fallback to digits for very large ints
    function intToWordsSafe(intStr) {
      intStr = String(intStr).replace(/^0+(?!$)/, "");
      if (intStr.length > 9) {
        // For very large numbers, read digit-by-digit to avoid heavy builders
        return intStr.split("").map(digitWord).join(" ");
      }
      const n = Number(intStr);
      if (!Number.isFinite(n)) return intStr.split("").map(digitWord).join(" ");
      return numberToWordsUnderBillion(n);
    }

    function digitWord(d) {
      return ["zero","one","two","three","four","five","six","seven","eight","nine"][Number(d)] || d;
    }

    function numberToWordsUnderBillion(n) {
      if (n === 0) return "zero";
      const ones = ["","one","two","three","four","five","six","seven","eight","nine"];
      const teens = ["ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
      const tens = ["","", "twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

      function underThousand(x){
        let out = "";
        const h = Math.floor(x/100);
        const r = x%100;
        if (h) out += ones[h] + " hundred";
        if (h && r) out += " ";
        if (r >= 20) {
          out += tens[Math.floor(r/10)];
          if (r%10) out += "-" + ones[r%10];
        } else if (r >= 10) {
          out += teens[r-10];
        } else if (r > 0) {
          out += ones[r];
        }
        return out;
      }

      const parts = [];
      const millions = Math.floor(n/1_000_000);
      const thousands = Math.floor((n%1_000_000)/1_000);
      const rest = n%1_000;
      if (millions) parts.push(underThousand(millions) + " million");
      if (thousands) parts.push(underThousand(thousands) + " thousand");
      if (rest) parts.push(underThousand(rest));
      return parts.join(" ");
    }

    // === Chunk/process in paragraphs ===
    function chunkText(text, maxLen) {
      const paras = text
        .replace(/\r\n/g, "\n")
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(Boolean);

      const out = [];
      for (const p of paras) {
        if (p.length <= maxLen) {
          out.push(p);           // one utterance per paragraph
        } else {
          out.push(...splitByLen(p, maxLen)); // only split if one paragraph is huge
        }
      }
      return out;
    }

    function splitByLen(s, maxLen) {
      const parts = [];
      let cur = "";
      const tokens = s.split(/(\s+|,|;|:)/);
      for (const t of tokens) {
        if ((cur + t).length > maxLen) {
          if (cur.trim()) parts.push(cur.trim());
          cur = t.trimStart();
          while (cur.length > maxLen) {
            parts.push(cur.slice(0, maxLen));
            cur = cur.slice(maxLen);
          }
        } else {
          cur += t;
        }
      }
      if (cur.trim()) parts.push(cur.trim());
      return parts;
    }

    // status helpers
    function say(text) {
      if (output) output.textContent = text;
    }
    function appendStatus(text) {
      if (output) output.textContent += text;
    }
    function replaceFirstLine(newLine) {
      if (!output) return;
      const lines = output.textContent.split("\n");
      lines[0] = newLine;
      output.textContent = lines.join("\n");
    }

    // append to UI (plain text)
    function appendToOutput(s) {
      if (!s) return;
      spokenSoFar += s;
      if (output) output.textContent = spokenSoFar;
    }

    // Initialize icon state on load
    iconIdle();

    // Return a tiny API (handy for tests)
    return {
      speakText: startSpeaking,
      cancel
    };
  }

  return { wirePage };
});
