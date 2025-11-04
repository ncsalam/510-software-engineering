[![ESLint Style/Syntax](https://img.shields.io/badge/Style-ESLint-4B32C3?logo=eslint&logoColor=white)](https://github.com/ejrezek/510-software-engineering/blob/badgesV2/proj2/eslint.config.js)
[![Prettier Format](https://img.shields.io/badge/Format-Prettier-F7B93E?logo=prettier&logoColor=white)](https://github.com/ejrezek/510-software-engineering/blob/badgesV2/proj2/prettier.config.js)
[![codecov](https://codecov.io/gh/ncsalam/510-software-engineering/branch/main/graph/badge.svg?token=6K93NJ8JE6)](https://codecov.io/gh/ncsalam/510-software-engineering)
[![License: MIT](https://img.shields.io/badge/License-MIT-4B32C3?logo=open-source-initiative&logoColor=white)](LICENSE.md)

<p align="center">
  <img src="./src/public/uncle_tony_logo.png" alt="Uncle Tony Logo" width="400"/>
</p>

# Uncle Tony Voice App

A web application that allows users to speak, transcribes their speech to text, sends prompts to an Ollama LLM, and optionally reads text aloud using Text-to-Speech (TTS).

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)
6. [Contributing & Code of Conduct](#contributing--code-of-conduct)

---

## Project Overview

**Uncle Tony** features:

- **Voice-to-Text (STT)**: Capture spoken input and display it as text.
- **Text-to-Speech (TTS)**: Read text aloud using browser-supported Italian voices.
- **LLM Integration**: Send prompts to an Ollama model and display responses.
- **Transcript Download**: Save spoken transcripts to a `.txt` file.

---

## Architecture

User → Browser UI → STT Module → Server → Ollama LLM → Server → Browser UI → TTS Module

### Components

#### Frontend

- **`index.html`**: Main interface with buttons, output, and temporary file upload.
- **`speech-to-text.mjs`**: Captures and processes speech.
- **`text-to-speech.mjs`**: Converts text into spoken audio.
- **`style.css`**: Styles buttons, output boxes, and audio icon.
- **`preprocess.mjs`**: Handles preprocessing from text to natural spoken language.

#### Backend Server

- **`server.js`**: Express server serving static files and handling `/api/send`.
- **`ollama-interface.mjs`**: Interacts with Ollama models (installation, chat requests, warm-up).
- **`terminal-helper.mjs`**: Optional terminal styling for server logs.
- **`chat-db.mjs`**:
- **`sqlite3-async-mjs`**:
- **`validation.mjs`**:

#### Backend Database

- **`Main.py`**:
- **`files_tools.py`**:
- **`html_tools.py`**:
- **`google_tools.py`**:
- **`menu_recreator.py`**:
- **`restaurants_raleigh.db`**:
- **`sqlite_connection.py`**:

- #### Testing

- **`TTS.test.js`**: DOM + TTS integration tests.
- **`STT.test.js`**: DOM + STT integration tests.
- **`api.test.mjs`**:
- **`chat-db.test.mjs`**:
- **`mock-ollama.mjs`**:
- **`ollama-interface.mjs`**:
- **`sqlite3-async.test.mjs`**:
- **`terminal-helper.mjs`**:
- **`llm_response.test.js`**:

---

## Setup & Installation

See [INSTALL.md](INSTALL.md) for detailed installation steps.

## Testing

Run all tests with Jest:

```bash
npm run test
```

## Troubleshooting

- Ollama errors: Ensure Ollama is installed and the specified model is available.
- No voices for TTS: Confirm browser supports Web Speech API.
- Transcript download fails: Ensure the transcript is not empty.

Please fill out form to request help or report a bug https://forms.gle/UN1Nj76CAN9gSitY6

## Contributing & Code of Conduct

See [CONTRIBUTING](CONTRIBUTING.md) before contributing to this project.
See [CODE_OF_CONDUCT](CODE_OF_CONDUCT.md) when contributing to this project.

