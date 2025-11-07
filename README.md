[![ESLint Style/Syntax](https://img.shields.io/badge/Style-ESLint-4B32C3?logo=eslint&logoColor=white)](https://github.com/ejrezek/510-software-engineering/blob/badgesV2/proj2/eslint.config.js)
[![Prettier Format](https://img.shields.io/badge/Format-Prettier-F7B93E?logo=prettier&logoColor=white)](https://github.com/ejrezek/510-software-engineering/blob/badgesV2/proj2/prettier.config.js)
[![codecov](https://codecov.io/gh/ncsalam/510-software-engineering/branch/main/graph/badge.svg?token=6K93NJ8JE6)](https://codecov.io/gh/ncsalam/510-software-engineering)
[![License: MIT](https://img.shields.io/badge/License-MIT-4B32C3?logo=open-source-initiative&logoColor=white)](LICENSE.md)
[![DOI](https://zenodo.org/badge/1044506900.svg)](https://doi.org/10.5281/zenodo.17488987)
[![JSDoc](https://img.shields.io/badge/Documentation-JSDoc-brightgreen?logo=jsdoc&logoColor=white)](https://jsdoc.app/)



<p align="center">
  <img src="./src/public/uncle_tony_logo.png" alt="Uncle Tony Logo" width="400"/>
</p>

# Uncle Tony's Food Finder

> Ciao, amici! Let me tell you about Uncle Tony's Food Finder - that's me! My name is Uncle Tony, and I'm here to help you
> discover the flavors of your new favorite restaurant. Are you tired of eating at places that just aren't doing it for you?
> Do you find yourself scrolling through menus, wondering what's good and what's not? Well, let me be your guide, amici!
> I'll take you on a culinary journey through the neighborhoods, highlighting the best eateries, hidden gems, and must-try dishes.

A web application that allows users to speak, transcribes their speech to text, sends prompts to an Ollama LLM, and reads text aloud using Text-to-Speech (TTS).

https://github.com/user-attachments/assets/0bcb50e4-92a9-4164-a4c5-4b07b89ca2d2

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
- **Real Menu Data**: uses Google places API and ChatGPT to collect real restaurant data.

---

## Architecture

![Architecture Diagram](images/arch-diagram.png)

### Components

#### Frontend

in [src/public](src/public)

- **`index.html`**: Main interface with buttons, output, and file upload.
- **`llm_response.mjs`**: Serves as a pipeline for speech-to-text to LLM to text-to-speech components.
- **`speech-to-text.mjs`**: Captures and transcribes speech.
- **`text-to-speech.mjs`**: Converts text to spoken audio.
- **`style.css`**: Styles buttons, output, and audio icons.
- **`preprocess.mjs`**: Prepares text for natural speech output.

#### Backend Server

in [src](src) and [src/server](src/server)

- **`app.js`**: Express server serving frontend and API endpoints.
- **`server.js`**: Wrapper for running the app
- **`ollama-interface.mjs`**: Handles Ollama AI requests.
- **`terminal-helper.mjs`**: Terminal logging utilities.
- **`restaurant-data.mjs`**: For getting restaurant data from the database
- **`chat-db.mjs`**: Manages chat storage.
- **`sqlite3-async-mjs`**: Async SQLite wrapper.
- **`validation.mjs`**: Input and data validation utilities.

#### Backend Database

in [src/database](src/database).
For more info about running and using the restaurant database, see [src/database/README.md](src/database/README.md)

- **`Main.py`**: Main backend orchestration.
- **`files_tools.py`**: File operations.
- **`html_tools.py`**: HTML parsing/generation.
- **`google_tools.py`**: Google API integration.
- **`menu_recreator.py`**: Recreates restaurant menus.
- **`restaurants_raleigh.db`**: Restaurant database.
- **`sqlite_connection.py`**: SQLite connection management.

#### Testing

in [tests](tests)

- **`TTS.test.js`**: Text-to-Speech tests.
- **`STT.test.js`**: Speech-to-Text tests.
- **`api.test.mjs`**: API endpoint tests.
- **`chat-db.test.mjs`**: Chat DB tests.
- **`mock-ollama.mjs`**: Ollama mock for tests.
- **`ollama-interface.mjs`**: Ollama interface tests.
- **`sqlite3-async.test.mjs`**: Async SQLite tests.
- **`terminal-helper.mjs`**: Terminal helper tests.
- **`llm_response.test.js`**: Language model response tests.


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
- Ollama needs more GPU to load full model: Retart VSCode or other IDE and re-run.
- No voices for TTS: Confirm browser supports Web Speech API.


Please fill out [this form](https://forms.gle/UN1Nj76CAN9gSitY6) to request help or report a bug

## Contributing & Code of Conduct

See [CONTRIBUTING](CONTRIBUTING.md) before contributing to this project.
See [CODE_OF_CONDUCT](CODE_OF_CONDUCT.md) when contributing to this project.
