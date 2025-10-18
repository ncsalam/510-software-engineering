import dotenv from "dotenv";
import express from "express";
import { startOllama } from "./server/ollama-interface.js";
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

app.post("/api/send", (req, res) => {
  res.json({ message: "not implemented" });
});

app.listen(PORT, () => {
  console.log(
    "Started server at " +
      color(`http://localhost:${PORT}`, { fg: COLORS.YELLOW }),
  );
});
