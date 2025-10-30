/**
 * @jest-environment jsdom
 *
 * Integration test for the LLM pipeline (ESM):
 * STT -> fetch(/api/send) -> preprocess -> TTS.speakText
 */
import { jest } from "@jest/globals";

// Allow pending microtasks (e.g., fetch().then(...)) to run
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("llm_response (ESM) – STT → LLM → preprocess → TTS", () => {
  beforeEach(() => {
    jest.resetModules();

    // Minimal DOM used by llm_response.mjs
    document.body.innerHTML = `
      <button id="done">Done / Save Transcript</button>
      <p id="output"></p>
      <div id="word-box"></div>
    `;

    // Default mocked LLM response
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ response: "It is 10:00 PM and costs $19.99." }),
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

    jest.unstable_mockModule(
      "../src/public/speech-to-text/speech-to-text.mjs",
      () => ({ wirePage: wirePageSTTMock })
    );
    jest.unstable_mockModule(
      "../src/public/text-to-speech/text-to-speech.mjs",
      () => ({ wirePage: wirePageTTSMock })
    );

    // Use the real preprocess to verify actual transformations
    const preprocess = await import(
      "../src/public/text-to-speech/preprocess.mjs"
    );

    await import("../src/public/llm_response.mjs");

    // Trigger DOMContentLoaded which llm_response waits on
    document.dispatchEvent(new Event("DOMContentLoaded"));

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
    const expectedSpoken = preprocess.englishifyNumbers(
      preprocess.englishifyTimes(rawReply)
    );
    expect(speakTextMock).toHaveBeenCalledWith(expectedSpoken, rawReply);

    // STT/TTS wired once
    expect(wirePageSTTMock).toHaveBeenCalledTimes(1);
    expect(wirePageTTSMock).toHaveBeenCalledTimes(1);

    // fetch should be called with the correct endpoint and payload
    expect(fetch).toHaveBeenCalledWith("/api/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Hello from STT" }),
    });
  });
});
