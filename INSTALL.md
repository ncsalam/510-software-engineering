# INSTALL.md

## Prerequisites

- [Node.js](https://nodejs.org/en/download) 18+ and npm (comes bundled with Node.js install)
- [Ollama](https://ollama.com/download) installed with your preferred model

### Prerquisites for database

if you also need to work on the database submodule, you'll need:

- [python](https://www.python.org/downloads/)
- [uv](https://docs.astral.sh/uv/getting-started/installation/)

for more information, see [src/database/README.md](src/database/README.md)

## Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/ncsalam/510-software-engineering.git
   cd 510-software-engineering
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm run start
   ```

4. Open browser at `http://localhost:8000`.
