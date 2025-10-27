# Uncle Tony Voice App

A web application that allows users to speak, transcribes their speech to text, sends prompts to an Ollama LLM, and optionally reads text aloud using Text-to-Speech (TTS). Perfect for experimenting with voice interaction and LLM integration.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [Usage](#usage)
5. [API](#api)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Future Improvements](#future-improvements)
9. [License](#license)

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
- **`speech-to-text.js`**: Captures and processes speech.
- **`text-to-speech.js`**: Converts text into spoken audio.
- **`voice.js`**: Helper functions for starting/stopping recognition, updating transcripts, and downloading them.
- **`style.css`**: Styles buttons, output boxes, and audio icon.

#### Backend

- **`server.js`**: Express server serving static files and handling `/api/send`.
- **`ollama-interface.mjs`**: Interacts with Ollama models (installation, chat requests, warm-up).
- **`terminal-helper.mjs`**: Optional terminal styling for server logs.

#### Testing

- **`voice.test.js`**: Unit tests for voice helpers.
- **`stt.test.js`**: DOM + STT integration tests.

---

## Setup & Installation

### Prerequisites

- Node.js (v18+ recommended)
- [Ollama](https://ollama.com/download)
- Optional: SQLite (if extending for database storage)

### Steps

1. **Clone the repository**

```bash
git clone <repo-url>
cd <repo-folder>
```

2. **Install Dependencies**

```bash
npm install
```

3. **Start Server**

```bash
npm run start
```

4. **Open Browser**
   Navigate to http://localhost:3000
