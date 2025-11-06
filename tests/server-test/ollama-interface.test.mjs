import { describe, expect, jest, test } from "@jest/globals";
import { factory } from "./mock-ollama.mjs";

// mock ollama to avoid long API calls
jest.unstable_mockModule("ollama", factory);

const { startOllama, send } = await import("../../src/server/ollama-interface.mjs");

describe("startOllama function", () => {
  test("returns true on success", async () => {
    console.log = jest.fn(() => {}); // supress console output
    expect(await startOllama("llama3.2:latest", 15)).toEqual(true);
  });

  test("installs model if not found", async () => {
    const mockConsole = jest.fn(() => {});
    console.log = mockConsole;
    expect(await startOllama("newModel", 15)).toEqual(true);
    expect(mockConsole.mock.calls[1][0]).toMatch(/^Installing model/);
  });

  // hard to test because they would require much more complicated mocking.
  // test.todo("throws an error if ollama is not installed");
  // test.todo("throws an error if the model fails to install");
});

describe("send function", () => {
  test("returns a chat response from ollama", async () => {
    expect(await send("llama3.2:latest", [{ role: "user", message: "hello" }], 15)).toHaveProperty("message.role");
  });
});
