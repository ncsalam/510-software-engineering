/**
 * JSDOM tests for Text-to-Speech.
 */

/* --------------
 * Fixed imports
 * --------------*/
import { jest } from "@jest/globals";
import * as preprocess from "../../src/public/text-to-speech/preprocess.mjs";
import { wirePage }  from "../../src/public/text-to-speech/text-to-speech.mjs";

/* ============================================================
 * Unit tests: helper functions in preprocess.mjs (no DOM / no speech)
 * ============================================================ */
describe("preprocess helpers (unit)", () => {
  // Verify time phrases become natural speech (o'clock, am/pm)
  test("englishifyTimes: 10:00 PM -> ten o'clock pm", () => {
    const input = "Meeting at 10:00 PM tonight.";
    const out = preprocess.englishifyTimes(input);
    expect(out).toContain("ten o'clock pm");
  });

  // Verify money and percentages are expanded into words
  test("englishifyNumbers: $19.99 and 12.5%", () => {
    const input = "Price is $19.99 and discount is 12.5%.";
    const out = preprocess.englishifyNumbers(input);
    expect(out).toContain("Price is nineteen dollars and ninety-nine cents and discount is twelve point five percent.");
  });

  // Check edge cases around dollar amounts
  test("dollarsToWords edge cases", () => {
    expect(preprocess.dollarsToWords("0.01")).toBe("one cent");
    expect(preprocess.dollarsToWords("1")).toBe("one dollar");
    expect(preprocess.dollarsToWords("1234.50")).toBe("one thousand two hundred thirty-four dollars and fifty cents");
  });

  // Huge integers: we fall back to digit-by-digit to avoid heavy logic
  test("intToWordsSafe: large numbers fallback", () => {
    const s = "123456789012";
    const out = preprocess.intToWordsSafe(s);
    expect(out.split(" ").length).toBe(s.length);
  });

  // Paragraph-only chunking: split on blank lines, preserve lines within a paragraph
  test("chunkText: paragraph-only splits", () => {
    const input = "Para one.\n\nPara two line 1.\nPara two line 2.\n\nPara three.";
    const chunks = preprocess.chunkText(input, 2000);
    expect(chunks).toEqual(["Para one.", "Para two line 1.\nPara two line 2.", "Para three."]);
  });
});

/* ============================================================
 * Minimal integration test for text-to-speech.mjs:
 *   - Provide the minimal DOM the module expects
 *   - Mock the Web Speech API so nothing actually speaks
 *   - Call wirePage() and exercise speakText()
 * ============================================================ */
describe("wirePage integration (minimal)", () => {
  let win, doc;

  beforeEach(() => {
    // jsdom globals
    win = window;
    doc = document;

    // Minimal markup the module relies on
    document.body.innerHTML = `
      <input id="txtfile" type="file" />
      <div id="word-box"></div>
      <div id="audioIcon"></div>
    `;

    // Keep output formatting consistent with app behavior
    doc.getElementById("word-box").style.whiteSpace = "pre-wrap";

    // ---- Web Speech API mocks ----
    // Clean any prior definitions to avoid "Cannot redefine property" errors.
    try {
      delete win.speechSynthesis;
    } catch {;}
    try {
      delete global.speechSynthesis;
    } catch {;}
    try {
      delete win.SpeechSynthesisUtterance;
    } catch {;}
    try {
      delete global.SpeechSynthesisUtterance;
    } catch {;}

    // Simulate speak() life cycle: trigger onstart/onend so handlers run
    const speakMock = jest.fn((utt) => {
      if (typeof utt.onstart === "function") utt.onstart();
      if (typeof utt.onend === "function") utt.onend();
    });
    const cancelMock = jest.fn();
    const getVoicesMock = jest.fn(() => [{ name: "Luca", lang: "it-IT" }]);

    // Define speechSynthesis with configurable:true so future tests can re-mock
    Object.defineProperty(global, "speechSynthesis", {
      value: {
        speak: speakMock,
        cancel: cancelMock,
        getVoices: getVoicesMock,
        onvoiceschanged: null,
      },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(win, "speechSynthesis", {
      value: global.speechSynthesis,
      configurable: true,
      writable: true,
    });

    // Minimal utterance shim used by the module
    const SSU = function (text) {
      this.text = text;
      this.lang = "it-IT";
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
      this.onboundary = null;
    };
    Object.defineProperty(global, "SpeechSynthesisUtterance", {
      value: SSU,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(win, "SpeechSynthesisUtterance", {
      value: SSU,
      configurable: true,
      writable: true,
    });
  });

  test("prints original paragraphs with single blank line separation", () => {
    const api = wirePage(window, document);
    api.speakText("A\n\nB", "A\n\nB");
    const printed = document.getElementById("word-box").textContent;
    expect(printed).toBe("A\n\nB");
  });

  test("cancel stops TTS and resets", () => {
    const api = wirePage(window, document);
    api.speakText("ciao", "ciao");
    api.cancel();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(document.getElementById("audioIcon").classList.contains("speaking")).toBe(false);
  });

  test("boundary triggers pulse burst", () => {
    const api = wirePage(window, document);
    api.speakText("ciao", "ciao");
    const utter = window.speechSynthesis.speak.mock.calls[0][0];
    const icon = document.getElementById("audioIcon");
    utter.onboundary && utter.onboundary({});
    expect(icon.classList.contains("pulse-burst")).toBe(true);
  });

  test("wirePage returns API and speakText prints original text and calls speak", () => {
    // Create the module’s public API bound to our jsdom window/document
    const api = wirePage(win, doc);
    expect(api).toBeDefined();
    expect(typeof api.speakText).toBe("function");

    // Prepare original/processed text like the app would
    const original = "Hello world.\n\nSecond paragraph.";
    const spoken = preprocess.englishifyNumbers(preprocess.englishifyTimes(original));

    // Invoke the public API (no file input needed for this test)
    api.speakText(spoken, original);

    // We expect the original text to be printed to the word-box
    const out = doc.getElementById("word-box").textContent;
    expect(out).toContain("Hello world.");
    expect(out).toContain("Second paragraph.");

    // And the Web Speech API to have been called
    expect(win.speechSynthesis.speak).toHaveBeenCalled();
  });
});
