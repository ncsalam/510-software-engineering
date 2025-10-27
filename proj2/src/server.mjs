import dotenv from "dotenv";
import { startOllama, send } from "./server/ollama-interface.mjs";
import { COLORS, color } from "./server/terminal-helper.mjs";
import { validateField, handleValidationErrors } from "./server/validation.mjs";

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

*/
app.post(
  "/api/chat",
  validateField("message"),
  handleValidationErrors,
  async (req, res) => {
    res.json({
      response: "not implemented",
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
*/
app.post(
  "/api/chat/{id}",
  validateField("message"),
  handleValidationErrors,
  async (req, res) => {
    res.json({
      response: "not implemented",
    });
  },
);

/*
delete an existing chat from the LLM history.
*/
app.delete("/api/chat/{id}", async (req, res) => {
  res.json({
    response: "not implemented",
  });
});

app.listen(PORT, () => {
  console.log(
    "Started server at " +
      color(`http://localhost:${PORT}`, { fg: COLORS.YELLOW }),
  );
});
