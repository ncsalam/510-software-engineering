/**
 * the main application code.
 *
 * @module app
 */

import dotenv from "dotenv";
import { validateField, handleValidationErrors, validateChatExists } from "./server/validation.mjs";
import express from "express";
import * as db from "./server/chat-db.mjs";
import { getRestaurantData } from "./server/restaurant-data.mjs";

const { startOllama, send } = await import("./server/ollama-interface.mjs");

await getRestaurantData();

dotenv.config({ quiet: true });
const ollamaOk = await startOllama(process.env.OLLAMA_MODEL, process.env.OLLAMA_KEEP_ALIVE);
if (!ollamaOk) process.exit(1);
db.init();

export const PORT = process.env.PORT;
export const app = express();
app.use(express.static("src/public"));
app.use(express.json());

/*
making an API request:

POST /api/send HTTP/1.1
Content-Type: application/json

{ message : "your prompt goes here"}

response (accepted):
HTTP/1.1 200 OK
Content-Type: application/json

{response: "LLM response content here"}

minimal JS example:
fetch("/api/send", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ message: "why is the sky blue?" }),
}).then(async (res) => console.log(await res.json()));
*/

/*
generate a one-off llm response.
required headers:
content-type: application/json

body format:
{
  message: "your message content"
}
*/
app.post(
  "/api/send", // endpoint path
  validateField("message"),
  handleValidationErrors,
  async (req, res) => {
    const llm_res = await send(
      process.env.OLLAMA_MODEL,
      [{ role: "user", content: req.body.message }],
      process.env.OLLAMA_KEEP_ALIVE
    );
    // return response from LLM
    res.json({
      response: llm_res.message.content,
    });
  }
);

/*
create a new chat with the LLM.

required headers:
none

response format (success):
{
  id: <int>
}
*/
app.post("/api/chat", async (req, res) => {
  res.status(201).json({
    id: await db.newChat(),
  });
});

/*
generate a chat response from the llm. (aware of previous messages sent to this endpoint)

required headers:
content-type: application/json

body format:
{
  message: "your message content"
}

response format:
{
  response: "llm's response"
}
*/
app.post("/api/chat/:id", validateChatExists, validateField("message"), handleValidationErrors, async (req, res) => {
  // add user message to chat history
  await db.logMessage(req.params.id, "user", req.body.message);
  // build message array out of chat history and system prompts
  const chat = [
    {
      role: "system",
      content: process.env.OLLAMA_SYS_PROMPT,
    },
    {
      role: "system",
      content: process.env.OLLAMA_DATA_PROMPT + (await getRestaurantData()),
    },
    ...(await db.getHistory(req.params.id)),
  ];
  // generate chat completion
  const llm_res = await send(process.env.OLLAMA_MODEL, chat, process.env.OLLAMA_KEEP_ALIVE);
  // log assistant response and return it
  await db.logMessage(req.params.id, "assistant", llm_res.message.content);
  res.json({
    response: llm_res.message.content,
  });
});

/*
delete an existing chat from the LLM history by id.
*/
app.delete("/api/chat/:id", validateChatExists, async (req, res) => {
  db.deleteChat(req.params.id);
  res.json({
    ok: true,
  });
});
