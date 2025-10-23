import dotenv from "dotenv";
import express from "express";
import { body, checkSchema, validationResult } from "express-validator";
import { startOllama, send } from "./server/ollama-interface.js";
import { COLORS, color } from "./server/terminal-helper.js";

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

app.post(
  // endpoint path
  "/api/send",
  // input validation
  body("message").notEmpty().withMessage("'message' field is missing."),
  // response handler
  async (req, res) => {
    // check for validation errors
    const result = validationResult(req);
    if (!result.isEmpty()) {
      res.status(422).json({ errors: result.array() });
      return;
    }
    // return response from LLM
    res.json({
      response: (
        await send(
          process.env.OLLAMA_MODEL,
          [{ role: "user", content: req.body.message }],
          process.env.OLLAMA_KEEP_ALIVE,
        )
      ).message.content,
    });
  },
);

app.listen(PORT, () => {
  console.log(
    "Started server at " +
      color(`http://localhost:${PORT}`, { fg: COLORS.YELLOW }),
  );
});
