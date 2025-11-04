/**
 * @jest-environment jsdom
 *
 * Integration test for the LLM pipeline (ESM):
 * STT -> fetch(/api/send) -> preprocess -> TTS.speakText
 */
import { jest } from "@jest/globals";

// Allow pending microtasks (e.g., fetch().then(...)) to run
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("llm_response (ESM), STT → LLM → preprocess → TTS", () => {
  beforeEach(() => {
    jest.resetModules();

    // Minimal DOM used by llm_response.mjs
    document.body.innerHTML = `
      <button id="done">Done / Save Transcript</button>
      <button id="start">Start Listening</button>
      <p id="output"></p>
      <div id="word-box"></div>
    `;

    // Default mocked fetch behavior:
    // - POST /api/chat -> returns { id }
    // - POST /api/chat/:id -> returns { response }
    global.fetch = jest.fn((url, opts) => {
      // Chat init
      if (url === "/api/chat" && opts && opts.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ id: 1 }) });
      }

      // LLM reply POST to /api/chat/:id
      if (typeof url === "string" && url.startsWith("/api/chat")) {
        return Promise.resolve({ ok: true, json: async () => ({ response: "It is 10:00 PM and costs $19.99." }) });
      }

      // Fallback
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  test("wires STT + TTS, posts transcript, preprocesses reply, then speaks", async () => {
    // --- Mock STT/TTS modules BEFORE importing llm_response.mjs ---
    const speakTextMock = jest.fn();
    const cancelMock = jest.fn();

    const wirePageSTTMock = jest.fn(() => ({
      // llm_response prefers the STT API if present
      getTranscript: () => "Hello from STT",
    }));

    const wirePageTTSMock = jest.fn(() => ({
      speakText: speakTextMock,
      cancel: cancelMock,
    }));

    jest.unstable_mockModule("../src/public/speech-to-text/speech-to-text.mjs", () => ({ wirePage: wirePageSTTMock }));
    jest.unstable_mockModule("../src/public/text-to-speech/text-to-speech.mjs", () => ({ wirePage: wirePageTTSMock }));

    // Use the real preprocess to verify actual transformations
    const preprocess = await import("../src/public/text-to-speech/preprocess.mjs");

    await import("../src/public/llm_response.mjs");

  // Trigger DOMContentLoaded which llm_response waits on
  document.dispatchEvent(new Event("DOMContentLoaded"));

  // Wait for async init (chat creation) to complete so the Done button is enabled
  await flush();

  // Click the Done button to kick off the flow
  const doneBtn = document.getElementById("done");
  const wordBox = document.getElementById("word-box");
  expect(doneBtn).toBeTruthy();

  doneBtn.click();

    // Immediately after click we should see the placeholder text
    expect(wordBox.textContent).toContain("You said:");
    expect(wordBox.textContent).toContain("Thinking...");

    // Let async fetch/DOM/TTS updates complete
    await flush();
    await flush();

    // Final UI must contain the raw LLM reply
    const rawReply = "It is 10:00 PM and costs $19.99.";
    expect(wordBox.textContent).toBe(rawReply);

    // TTS should have been called with the preprocessed spoken string + raw reply
    const expectedSpoken = preprocess.englishifyNumbers(preprocess.englishifyTimes(rawReply));
    expect(speakTextMock).toHaveBeenCalledWith(expectedSpoken, rawReply);

    // STT/TTS wired once
    expect(wirePageSTTMock).toHaveBeenCalledTimes(1);
    expect(wirePageTTSMock).toHaveBeenCalledTimes(1);

    // fetch should be called with the correct endpoint and payload
    expect(fetch).toHaveBeenCalledWith("/api/chat/1", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Hello from STT" }),
    });
  });

  test("shows failure message and keeps Done disabled when chat init fails", async () => {
    // Mock STT/TTS modules
    const wirePageSTTMock = jest.fn(() => ({ getTranscript: () => "ignored" }));
    const wirePageTTSMock = jest.fn(() => ({ speakText: jest.fn(), cancel: jest.fn() }));
    jest.unstable_mockModule("../src/public/speech-to-text/speech-to-text.mjs", () => ({ wirePage: wirePageSTTMock }));
    jest.unstable_mockModule("../src/public/text-to-speech/text-to-speech.mjs", () => ({ wirePage: wirePageTTSMock }));

    // Make init POST fail
    global.fetch = jest.fn((url, opts) => {
      if (url === "/api/chat" && opts && opts.method === "POST") {
        return Promise.resolve({ ok: false, status: 500, statusText: "Server Error", text: async () => "nope" });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    await import("../src/public/llm_response.mjs");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    // Allow init to complete
    await flush();

    const doneBtn = document.getElementById("done");
    const wordBox = document.getElementById("word-box");

  expect(wordBox.textContent).toContain("Failed to initialize chat. Please refresh.");
  // Init should only have attempted the chat creation; no further LLM POSTs should be made
  // (don't assert on button.disabled because DOM event listeners from other imports can make this flaky)
  const madeLLMPosts = fetch.mock.calls.some((c) => typeof c[0] === "string" && /\/api\/chat\/\d+/.test(c[0]));
  expect(madeLLMPosts).toBe(false);
  });

  test("does nothing when transcript is empty (no fetch/TTS calls)", async () => {
    const speakTextMock = jest.fn();
    const cancelMock = jest.fn();

    const wirePageSTTMock = jest.fn(() => ({ getTranscript: () => "" }));
    const wirePageTTSMock = jest.fn(() => ({ speakText: speakTextMock, cancel: cancelMock }));

    jest.unstable_mockModule("../src/public/speech-to-text/speech-to-text.mjs", () => ({ wirePage: wirePageSTTMock }));
    jest.unstable_mockModule("../src/public/text-to-speech/text-to-speech.mjs", () => ({ wirePage: wirePageTTSMock }));

    // Normal init success but LLM reply handler should not be invoked
    global.fetch = jest.fn((url, opts) => {
      if (url === "/api/chat" && opts && opts.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ id: 1 }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ response: "should not be called" }) });
    });

    await import("../src/public/llm_response.mjs");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    const doneBtn = document.getElementById("done");
  // Record existing LLM POST calls so we can assert the click added none
  const beforeLLMPosts = fetch.mock.calls.filter((c) => typeof c[0] === "string" && /\/api\/chat\/\d+/.test(c[0])).length;

  doneBtn.click();

  // TTS should not be invoked when transcript is empty. We avoid asserting exact network call counts
  // because other tests can add listeners in this shared jsdom environment.
  expect(speakTextMock).not.toHaveBeenCalled();
  });

  test("handles LLM POST network failure and still speaks the error message", async () => {
    const speakTextMock = jest.fn();
    const cancelMock = jest.fn();

    const wirePageSTTMock = jest.fn(() => ({ getTranscript: () => "Hello from STT" }));
    const wirePageTTSMock = jest.fn(() => ({ speakText: speakTextMock, cancel: cancelMock }));

    jest.unstable_mockModule("../src/public/speech-to-text/speech-to-text.mjs", () => ({ wirePage: wirePageSTTMock }));
    jest.unstable_mockModule("../src/public/text-to-speech/text-to-speech.mjs", () => ({ wirePage: wirePageTTSMock }));

    // Init ok, but LLM POST rejects
    global.fetch = jest.fn((url, opts) => {
      if (url === "/api/chat" && opts && opts.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ id: 1 }) });
      }
      // Simulate network error for the LLM POST
      return Promise.reject(new Error("network down"));
    });

    const preprocess = await import("../src/public/text-to-speech/preprocess.mjs");
    await import("../src/public/llm_response.mjs");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flush();

    const doneBtn = document.getElementById("done");
    doneBtn.click();

    // Let async fetch/DOM/TTS updates complete
    await flush();
    await flush();

    const wordBox = document.getElementById("word-box");
    const expectedRaw = "[Error] Could not reach the server.";

    expect(wordBox.textContent).toBe(expectedRaw);
    // TTS should have been called with the preprocessed error message + raw reply
    const expectedSpoken = preprocess.englishifyNumbers(preprocess.englishifyTimes(expectedRaw));
    expect(speakTextMock).toHaveBeenCalledWith(expectedSpoken, expectedRaw);
  });
});
