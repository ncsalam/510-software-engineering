/**
 * JSDOM + Jest tests for Text-to-Speech.
 */

import { jest } from "@jest/globals";
import * as preprocess from "../../src/public/text-to-speech/preprocess.mjs";
import { wirePage } from "../../src/public/text-to-speech/text-to-speech.mjs";

/* ============================================================
 * Unit tests: preprocess helpers (no DOM / no speech)
 * ============================================================ */
describe("preprocess helpers (unit)", () => {
  // --- Time conversions ---
  test("englishifyTimes: 10:00 PM -> ten o'clock pm", () => {
    const input = "Meeting at 10:00 PM tonight.";
    const out = preprocess.englishifyTimes(input);
    expect(out).toContain("ten o'clock pm");
  });

  test("englishifyTimes: 3:05 a.m. -> three oh five am", () => {
    const input = "Alarm at 3:05 a.m.";
    const out = preprocess.englishifyTimes(input);
    expect(out).toContain("three oh five am");
  });

  test("englishifyTimes: 7 PM -> seven pm", () => {
    const out = preprocess.englishifyTimes("Event at 7 PM");
    expect(out).toContain("seven pm");
  });

  // --- Numbers and currency ---
  test("englishifyNumbers: $19.99 and 12.5%", () => {
    const input = "Price is $19.99 and discount is 12.5%.";
    const out = preprocess.englishifyNumbers(input);
    expect(out).toContain("Price is nineteen dollars and ninety-nine cents and discount is twelve point five percent.");
  });

  test("dollarsToWords edge cases", () => {
    expect(preprocess.dollarsToWords("0.01")).toBe("one cent");
    expect(preprocess.dollarsToWords("1")).toBe("one dollar");
    expect(preprocess.dollarsToWords("1234.50")).toBe("one thousand two hundred thirty-four dollars and fifty cents");
    expect(preprocess.dollarsToWords("0")).toBe("zero dollars");
  });

  test("intToWordsSafe: large numbers fallback", () => {
    const s = "123456789012";
    const out = preprocess.intToWordsSafe(s);
    expect(out.split(" ").length).toBe(s.length);
  });

  test("englishifyNumbers: decimals and commas", () => {
    const input = "Value: 1,234.56";
    const out = preprocess.englishifyNumbers(input);
    expect(out).toContain("one thousand two hundred thirty-four point five six");
  });

  test("englishifyNumbers: percentages without decimals", () => {
    const input = "Success rate 100%";
    const out = preprocess.englishifyNumbers(input);
    expect(out).toContain("one hundred percent");
  });

  // --- Paragraph chunking ---
  test("chunkText: paragraph-only splits", () => {
    const input = "Para one.\n\nPara two line 1.\nPara two line 2.\n\nPara three.";
    const chunks = preprocess.chunkText(input, 2000);
    expect(chunks).toEqual(["Para one.", "Para two line 1.\nPara two line 2.", "Para three."]);
  });

  test("chunkText: split very long paragraph by length", () => {
    const longPara = "a".repeat(5000);
    const chunks = preprocess.chunkText(longPara, 1000);
    expect(chunks.length).toBeGreaterThan(4);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(1000));
  });

  test("splitByLen preserves words where possible", () => {
    const s = "Word1 Word2 Word3";
    const out = preprocess.chunkText(s, 6);
    expect(out.length).toBeGreaterThan(1);
  });

  test("englishifyNumbers: negative values", () => {
    const input = "-$123.45 and -12.5%";
    const out = preprocess.englishifyNumbers(input);
    expect(out).toContain("minus one hundred twenty-three dollars and forty-five cents");
    expect(out).toContain("minus twelve point five percent");
  });

  test("englishifyNumbers: zero", () => {
    const input = "0 $0 0%";
    const out = preprocess.englishifyNumbers(input);
    expect(out).toContain("zero");
    expect(out).toContain("zero dollars");
    expect(out).toContain("zero percent");
  });
});

/* ============================================================
 * DOM + Integration tests: wirePage (jsdom)
 * ============================================================ */
describe("wirePage integration (DOM & TTS)", () => {
  let win, doc;

  beforeEach(() => {
    win = window;
    doc = document;

    document.body.innerHTML = `
      <input id="txtfile" type="file" />
      <div id="word-box"></div>
      <div id="audioIcon"></div>
    `;
    doc.getElementById("word-box").style.whiteSpace = "pre-wrap";

    // Mock Web Speech API
    const speakMock = jest.fn((utt) => {
      if (typeof utt.onstart === "function") utt.onstart();
      if (typeof utt.onboundary === "function") utt.onboundary();
      if (typeof utt.onend === "function") utt.onend();
    });
    const cancelMock = jest.fn();
    const getVoicesMock = jest.fn(() => [{ name: "Luca", lang: "it-IT" }]);
    Object.defineProperty(global, "speechSynthesis", {
      value: { speak: speakMock, cancel: cancelMock, getVoices: getVoicesMock, onvoiceschanged: null },
      configurable: true,
    });
    Object.defineProperty(win, "speechSynthesis", { value: global.speechSynthesis, configurable: true });

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
    Object.defineProperty(global, "SpeechSynthesisUtterance", { value: SSU, configurable: true });
    Object.defineProperty(win, "SpeechSynthesisUtterance", { value: SSU, configurable: true });
  });

  test("speakText prints original paragraphs", () => {
    const api = wirePage(win, doc);
    api.speakText("A\n\nB", "A\n\nB");
    const printed = doc.getElementById("word-box").textContent;
    expect(printed).toBe("A\n\nB");
  });

  test("cancel stops TTS and resets icon", () => {
    const api = wirePage(win, doc);
    api.speakText("Hello", "Hello");
    api.cancel();
    expect(win.speechSynthesis.cancel).toHaveBeenCalled();
    expect(doc.getElementById("audioIcon").classList.contains("speaking")).toBe(false);
  });

  test("boundary triggers pulse burst", () => {
    const api = wirePage(win, doc);
    api.speakText("Test", "Test");
    const utter = win.speechSynthesis.speak.mock.calls[0][0];
    utter.onboundary && utter.onboundary({});
    const icon = doc.getElementById("audioIcon");
    expect(icon.classList.contains("pulse-burst")).toBe(true);
  });

  test("wirePage returns API object", () => {
    const api = wirePage(win, doc);
    expect(api).toBeDefined();
    expect(typeof api.speakText).toBe("function");
    expect(typeof api.cancel).toBe("function");
  });

  test("speakText uses selected voice", () => {
    const api = wirePage(win, doc);
    api.speakText("Hi", "Hi");
    const utter = win.speechSynthesis.speak.mock.calls[0][0];
    expect(utter.voice.name).toBe("Luca");
  });

  test("speakText prints multiple paragraphs", () => {
    const api = wirePage(win, doc);
    api.speakText("Para1\n\nPara2", "Para1\n\nPara2");
    const out = doc.getElementById("word-box").textContent;
    expect(out).toBe("Para1\n\nPara2");
  });

  test("iconIdle sets icon to non-speaking state", () => {
    const api = wirePage(win, doc);
    api.cancel();
    const icon = doc.getElementById("audioIcon");
    expect(icon.classList.contains("speaking")).toBe(false);
  });

  test("speakNext handles empty chunks gracefully", () => {
    const api = wirePage(win, doc);
    api.speakText("", "");
    const printed = doc.getElementById("word-box").textContent;
    expect(printed).toBe("");
  });

  test("wirePage works if audioIcon missing", () => {
    document.getElementById("audioIcon").remove();
    const api = wirePage(win, doc);
    api.speakText("Test", "Test");
    // Should not throw; word-box still updated
    const printed = doc.getElementById("word-box").textContent;
    expect(printed).toBe("Test");
  });

  test("wirePage works if word-box missing", () => {
    document.getElementById("word-box").remove();
    const api = wirePage(win, doc);
    api.speakText("Test", "Test");
    // Should not throw; icon state still updated
    const icon = doc.getElementById("audioIcon");
    expect(icon.classList.contains("speaking")).toBe(false);
  });

  test("wirePage handles no voices gracefully", () => {
    win.speechSynthesis.getVoices = jest.fn(() => []);
    const api = wirePage(win, doc);
    api.speakText("Test", "Test");
    const utter = win.speechSynthesis.speak.mock.calls[0][0];
    expect(utter.lang).toBe("it-IT"); // fallback to config
  });

  test("long paragraph triggers multiple speakNext calls", () => {
    const longText = "x".repeat(3000);
    const api = wirePage(win, doc);
    api.speakText(longText, longText);
    const calls = win.speechSynthesis.speak.mock.calls.length;
    expect(calls).toBeGreaterThan(1);
  });

  test("onerror moves to next chunk", () => {
    const api = wirePage(win, doc);
    api.speakText("Hi", "Hi");
    const utter = win.speechSynthesis.speak.mock.calls[0][0];
    utter.onerror && utter.onerror();
    const printed = doc.getElementById("word-box").textContent;
    expect(printed).toBe("Hi");
  });

  test("boundaryBoostUntil increases after boundary", () => {
    const api = wirePage(win, doc);
    api.speakText("Hello", "Hello");
    const utter = win.speechSynthesis.speak.mock.calls[0][0];
    const before = Date.now();
    utter.onboundary();
    expect(utter).toBeDefined();
  });
});
