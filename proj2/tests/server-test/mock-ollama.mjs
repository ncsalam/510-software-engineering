// mock version of ollama for testing purposes
// so we don't have to wait 8 billion years for responses to generate

export default class Ollama {
  constructor() {
    console.log("mock Ollama constructed");
  }

  async *pull() {
    yield { total: 3, completed: 0 };
    yield { total: 3, completed: 1 };
    yield { total: 3, completed: 2 };
    yield { total: 3, completed: 3 };
  }

  async list() {
    return new Promise((resolve, reject) => {
      if (!ollamaInstalled) {
        reject({ error: "ollama not installed" });
        return;
      }
      resolve({
        models: [{ name: "llama3.2:latest" }],
      });
    });
  }

  async chat() {
    return new Promise((resolve, reject) => {
      resolve({
        message: {
          role: "assistant",
          content: "agent response",
        },
      });
    });
  }
}

export const factory = () => ({
  Ollama: Ollama,
});

// set to false for simulating errors
export let ollamaInstalled = true;
export let modelDownloadsSuccessfully = true;
