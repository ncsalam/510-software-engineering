import { expect, jest, test } from "@jest/globals";
import { factory } from "./mock-ollama.mjs";

// mock ollama to avoid long API calls
jest.unstable_mockModule("ollama", factory);

const { startOllama, send } = await import(
  "../../src/server/ollama-interface.mjs"
);

test("startOllama returns correctly", async () => {
  console.log = jest.fn(() => {}); // supress console output
  await startOllama("llama3.2:latest", 15);
});
