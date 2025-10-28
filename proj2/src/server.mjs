import dotenv from "dotenv";
import { startOllama, send } from "./server/ollama-interface.mjs";
import { COLORS, color } from "./server/terminal-helper.mjs";
import { validateField, handleValidationErrors } from "./server/validation.mjs";
import express from "express";
import * as db from "./server/chat-db.mjs";

// TODO: error validation (invalid id number)
// TODO: tests, lots and lots of tests :(

dotenv.config({ quiet: true });
const ollamaStatus = await startOllama(
  process.env.OLLAMA_MODEL,
  process.env.OLLAMA_KEEP_ALIVE,
);
if (!ollamaStatus) process.exit(1);

const PORT = process.env.PORT;
const app = express();
app.use(express.static("src/public"));
app.use(express.json());

const id = await db.newChat();
await db.logMessage(id, "user", "hello");
await db.logMessage(id, "assistant", "hello ;)");
console.log(await db.getHistory(id));

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
      process.env.OLLAMA_KEEP_ALIVE,
    );
    // return response from LLM
    res.json({
      response: llm_res.message.content,
    });
  },
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
app.post(
  "/api/chat",
  validateField("message"),
  handleValidationErrors,
  async (req, res) => {
    res.json({
      id: await db.newChat(),
    });
  },
);

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
app.post(
  "/api/chat/:id",
  validateField("message"),
  handleValidationErrors,
  async (req, res) => {
    // add user message to chat history
    db.logMessage(req.params.id, "user", req.body.message);
    // generate chat completion
    const llm_res = await send(
      process.env.OLLAMA_MODEL,
      await db.getHistory(req.params.id),
      process.env.OLLAMA_KEEP_ALIVE,
    );
    // log assistant response and return it
    db.logMessage(req.params.id, "assistant", llm_res.message.content);
    res.json({
      response: llm_res.message.content,
    });
  },
);

/*
delete an existing chat from the LLM history by id.
*/
app.delete("/api/chat/:id", async (req, res) => {
  db.deleteChat(req.params.id);
  res.json({
    ok: true,
  });
});

app.listen(PORT, () => {
  console.log(
    "Started server at " +
      color(`http://localhost:${PORT}`, { fg: COLORS.YELLOW }),
  );
});
