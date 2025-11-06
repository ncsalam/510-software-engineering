/**
 * A set of functions for interfacing with Ollama.
 * @module server/ollama-interface
 *
 */

import { COLORS, color, moveUp } from "./terminal-helper.mjs";

// have to dynamic import in order to be able to mock ollama for testing
const { Ollama } = await import("ollama");

const ollama = new Ollama();
/**
 * ensure that ollama is installed,
 * and that the correct model is installed and loaded into memory.
 *
 * @param {string} model - name of the model to use
 * @param {number} [minutes] - how long to keep the model loaded in memory between requests
 *
 * @returns {Promise<boolean>}
 */
export async function startOllama(model, minutes = 15) {
  console.log("Starting Ollama...");
  const info = await getInstalledModels();
  if (info.error) return false;
  if (info.models.includes(model)) {
    console.log(`Found model ${color(model, { fg: COLORS.BLUE })}`);
  } else {
    if (!(await installModel(model))) return false;
  }
  await warmUp(model, minutes);
  console.log("Done!\n");
  return true;
}

/**
 * get a list of all currently installed models
 *
 * @returns {Promise<{error: boolean, models: string[]}>}
 */
async function getInstalledModels() {
  try {
    return {
      error: false,
      models: (await ollama.list()).models.map((info) => info.name),
    };
  } catch {
    console.error(color("Fatal error: Ollama is not installed. See https://ollama.com/download", { fg: COLORS.RED }));
  }
  return {
    error: true,
    models: [],
  };
}

/**
 * tracks whether or not we've started installing a model yet.
 * used for formatting the progress bar correctly.
 */
let installStarted = false;

/**
 * given messages streamed by ollama during install,
 * draws a progress bar to the console.
 *
 * @param {*} msg
 */
function writeProgress(msg) {
  const scale_round = (n, s) => Math.floor(n * s);
  const barSize = 25;
  if (msg.total) {
    const pct = msg.completed / msg.total;
    if (!pct) return;
    const progress = scale_round(pct, barSize);
    if (installStarted) {
      moveUp(2);
    } else {
      installStarted = true;
    }
    console.log("Progress:");
    console.log(
      color(" ".repeat(progress), { bg: COLORS.GREEN }) +
        color(" ".repeat(barSize - progress), { bg: COLORS.WHITE }) +
        ` (${scale_round(pct, 100)}%)`
    );
  }
}

/**
 * install a model to Ollama.
 *
 * @param {string} model - model name
 * @returns {Promise<bool>} true on success, false on failure
 */
async function installModel(model) {
  console.log(`Installing model ${color(model, { fg: COLORS.BLUE })}`);
  try {
    const response = await ollama.pull({
      model: model,
      stream: true,
    });
    for await (const msg of response) {
      writeProgress(msg);
    }
    return true;
  } catch (e) {
    console.error(
      color(`Fatal error: failed to install model. (reason: ${e.error})`, {
        fg: COLORS.RED,
      })
    );
  }
  return false;
}

/**
 * send a simple chat request to the model to ensure it's loaded into memory
 * (to avoid 'cold starts' in the app).
 *
 * @param {string} model - name of the model to use
 * @param {number} [minutes] - how long to keep the model loaded in memory between requests
 */
async function warmUp(model, minutes) {
  console.log("Loading model into memory...");
  const res = await send(
    model,
    [
      {
        role: "system",
        content: "echo back whatever the user says to you.",
      },
      {
        role: "user",
        content: "echo",
      },
    ],
    minutes
  );
}

/**
 * send a set of messages to the LLM to generate a new chat completion
 *
 * @param {string} model - name of the model to use
 * @param {ollama.Message[]} messages - messages to send. can include system prompts, multiple chats, etc.
 * @param {number} minutes - time to keep model loaded in memory after this message.
 * @returns {Promise<ollama.ChatResponse>} - llm response
 */
export async function send(model, messages, minutes) {
  return await ollama.chat({
    model: model,
    messages: messages,
    stream: false,
    keep_alive: `${minutes}m`,
  });
}
