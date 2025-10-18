/**
 * @jest-environment jsdom
 */

const { startListening, stopListening, updateTranscript, downloadTranscript } = require('./voice');

describe("Voice-to-Text DOM Tests", () => {
  let startBtn, doneBtn, output, recognitionMock;

  beforeEach(() => {
    // Setup DOM elements
    document.body.innerHTML = `
      <button id="start">Start Listening</button>
      <button id="done">Done / Save Transcript</button>
      <p id="output"></p>
    `;
    startBtn = document.getElementById("start");
    doneBtn = document.getElementById("done");
    output = document.getElementById("output");

    // Mock recognition object
    recognitionMock = {
      start: jest.fn(),
      stop: jest.fn(),
    };
  });

  test("startListening updates state and button text", () => {
    const resetSilenceTimer = jest.fn();
    startListening(recognitionMock, startBtn, output, resetSilenceTimer);

    expect(recognitionMock.start).toHaveBeenCalled();
    expect(startBtn.textContent).toBe("Stop Listening");
    expect(output.textContent).toBe("Listening...");
    expect(resetSilenceTimer).toHaveBeenCalled();
  });

  test("stopListening updates state and button text", () => {
    const clearTimeoutFn = jest.fn();
    stopListening(recognitionMock, startBtn, clearTimeoutFn);

    expect(recognitionMock.stop).toHaveBeenCalled();
    expect(startBtn.textContent).toBe("Start Listening");
    expect(clearTimeoutFn).toHaveBeenCalled();
  });

  test("updateTranscript updates DOM and returns transcript", () => {
    const transcript = "Hello world";
    const result = updateTranscript(transcript, output);

    expect(output.textContent).toBe(transcript);
    expect(result).toBe(transcript);
  });

  test("downloadTranscript returns false if transcript empty", () => {
    const result = downloadTranscript("", jest.fn(), jest.fn(), jest.fn(), jest.fn());
    expect(result).toBe(false);
  });

  test("downloadTranscript calls necessary functions when transcript exists", () => {
    const createObjectURLFn = jest.fn().mockReturnValue("blob:url");
    const appendChildFn = jest.fn();
    const removeChildFn = jest.fn();
    const revokeURLFn = jest.fn();

    const transcript = "Test transcript";
    const result = downloadTranscript(transcript, createObjectURLFn, appendChildFn, removeChildFn, revokeURLFn);

    expect(result).toBe(true);
    expect(createObjectURLFn).toHaveBeenCalled();
    expect(appendChildFn).toHaveBeenCalled();
    expect(removeChildFn).toHaveBeenCalled();
    expect(revokeURLFn).toHaveBeenCalled();
  });
});
