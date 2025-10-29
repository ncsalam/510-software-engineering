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
    return new Promise((resolve, reject) =>
      resolve({
        models: [{ name: "llama3.2:latest" }],
      }),
    );
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
