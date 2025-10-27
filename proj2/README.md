# Uncle Tony Voice App

A web application that allows users to speak, transcribes their speech to text, sends prompts to an Ollama LLM, and optionally reads text aloud using Text-to-Speech (TTS). 

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [Quick Start](#quick-start)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

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

## Quick Start

**Frontend**

- Start Listening: Begin capturing voice input
- Done / Save Trascript: Stop Listening and optionally download trascript
- Read Text: Temporarily upload a .txt file for Text-To-Speech

**Flow Diagram**

flowchart LR
A[User speaks] --> B[STT Module (speech-to-text.js)]
B --> C[Server /api/send]
C --> D[Ollama LLM]
D --> C
C --> E[Browser UI: display response]
E --> F[TTS Module (text-to-speech.js)]
F --> A

### Development

**File Structure**

src/
└─ public/
├─ index.html
├─ style.css
├─ speech-to-text/
│ └─ speech-to-text.js
└─ text-to-speech/
└─ text-to-speech.js
server/
├─ server.js
├─ ollama-interface.mjs
└─ terminal-helper.mjs
tests/
├─ voice.test.js
└─ stt.test.js

## Testing

Run all tests with Jest:

```bash
npm test
```

Test coverage includes:

- STT module behavior (start/stop listening, updating transcript)
- Transcript download
- Button state changes and silence timer behavior
- DOM integration for speech recognition

## Troubleshooting

- Ollama errors: Ensure Ollama is installed and the specified model is available.
- No voices for TTS: Confirm browser supports Web Speech API.
- Transcript download fails: Ensure the transcript is not empty.

Please fill out form to request help or report a bug https://forms.gle/UN1Nj76CAN9gSitY6
