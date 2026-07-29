# scrive-mcp

A [Model Context Protocol](https://modelcontextprotocol.io/) server in TypeScript that integrates with [Scrive](https://www.scrive.com/) for document automation.

> **New here?** Follow the [Getting Started guide](https://scrive.github.io/mcp/guides/getting-started/) for a quick walkthrough. Full user-facing documentation lives at [scrive.github.io/mcp](https://scrive.github.io/mcp/). This README covers building and developing the server.

## Prerequisites

- Node.js 24+
- Corepack enabled
- pnpm 10+
- Docker (optional)

## Setup

### 1. Enable Corepack and install dependencies

```bash
corepack enable
pnpm install
```

### 2. Build the server and MCP App UI

```bash
pnpm run build
```

### 3. Configure credentials for stdio mode

Run the OAuth authorization flow:

```bash
node dist/index.js auth
```

This prompts for your Scrive server and OAuth client credentials (from your Scrive Integration settings), then opens your browser to authorize the application.

By default, credentials are stored in your OS keychain. Alternatively, if a keychain is unavailable on your system, you can configure the server to store credentials in a plain-text file on your disk:

```bash
export SCRIVE_MCP_INSECURE_STORAGE=true
```

`SCRIVE_MCP_INSECURE_STORAGE` selects the storage backend for both reading and writing, with no fallback between them. Two consequences:

- If you use it, set it everywhere the server runs, not just for `auth` — including the `env` block of your MCP client config. Credentials written to the plain-text file are not read back unless the variable is also set when the server starts.
- Upgrading from a version that stored credentials in a plain-text file requires re-running `auth` to store them in the keychain (or setting `SCRIVE_MCP_INSECURE_STORAGE=true` to keep using the file). Re-running `auth` does not delete the old plain-text file — remove it yourself if you no longer want it on disk.

## Running

### Stdio transport

For local MCP clients:

```bash
node dist/index.js stdio ~/Documents ~/Downloads
```

Arguments after `stdio` are directories the server is allowed to read PDFs from. Tools that take a local path (such as `create_document`) reject paths outside this list. `~` is expanded.

### HTTP transport

For remote deployments with bearer-token forwarding:

```bash
export PORT=8080
export AUTH_SERVER_URL=https://oauth2.scrive.com
export SCRIVE_BASE_URL=https://scrive.com
export RESOURCE_URL=https://your-host.example.com/mcp
export SCOPES=full
export ALLOWED_CORS_ORIGINS=https://claude.ai,https://chatgpt.com

node dist/index.js http
```

Set `ALLOWED_CORS_ORIGINS` to the exact web client origins that should be allowed to call `/mcp`. Wildcards such as `*` are not supported by the current HTTP transport.

The HTTP server exposes:

- `/.well-known/oauth-protected-resource`
- `/mcp`

DNS rebinding protection is enabled by default from the configured `RESOURCE_URL` hostname and can be disabled with:

```bash
export DISABLE_DNS_REBINDING_PROTECTION=true
```

## Available MCP Tools

| Tool                       | Description                                                |
| -------------------------- | ---------------------------------------------------------- |
| `create_document`          | Upload a PDF file from an absolute local path.             |
| `create_from_template`     | Create a new document from an existing template.           |
| `list_documents`           | List documents with filtering and sorting options.         |
| `get_document`             | Retrieve a document's full JSON representation.            |
| `update_document`          | Update the metadata of a document in Preparation.          |
| `set_file`                 | Set a local PDF as a Preparation document's main file.     |
| `add_party`                | Add a signing party to an existing document.               |
| `update_party`             | Update a party's role, name, or email on a document.       |
| `start_signing`            | Start the signing flow for a document.                     |
| `remind_document`          | Send reminders to signatories who have not signed yet.     |
| `cancel_document`          | Cancel a pending document.                                 |
| `download_document`        | Download a document's main PDF to a local directory.       |
| `get_usage_stats`          | Retrieve daily or monthly Scrive usage statistics.         |
| `create_flow_draft`        | Create a new Journey flow draft.                           |
| `add_document_to_draft`    | Add a PDF document to an existing Journey draft.           |
| `list_flow_drafts`         | List Journey flow drafts.                                  |
| `get_flow_draft`           | Retrieve a Journey flow draft.                             |
| `delete_flow_draft`        | Delete a Journey flow draft.                               |
| `start_flow`               | Start a Journey flow draft.                                |
| `add_participant_to_draft` | Add a participant to a Journey draft and regenerate steps. |

## Testing

```bash
pnpm test
pnpm run build
```

## Docker

### Build

```bash
docker build -t scrive-mcp .
```

### Run

```bash
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e AUTH_SERVER_URL=https://oauth2.scrive.com \
  -e SCRIVE_BASE_URL=https://scrive.com \
  -e RESOURCE_URL=https://your-host.example.com/mcp \
  -e SCOPES=full \
  -e ALLOWED_CORS_ORIGINS=https://claude.ai,https://chatgpt.com \
  scrive-mcp
```

## Security

Scrive takes security seriously. If you believe you have found a security issue in scrive-mcp, please report it privately to security@scrive.com rather than opening a public issue or pull request.

When reporting, please include:

- A description of the issue and its potential impact.
- Steps to reproduce, along with any proof-of-concept code, logs, or screenshots.
- The affected version or commit, and any relevant configuration.

We will acknowledge your report, investigate, and keep you informed as we work on a fix. Please give us reasonable time to address the issue before any public disclosure.

## Project Structure

```text
src/commands/    CLI commands (auth, stdio, http)
src/scrive/      Scrive API clients
src/tools/       MCP tool implementations
src/server.ts    MCP server setup and tool/resource registration
tests/           Vitest coverage for config and tool behavior
src/ui/          Vite-based MCP App example (file-upload UI for remote mode)
```

## Previewing the docs

The docs site lives under `docs/` and is built with [Hugo](https://gohugo.io/) using the [hugo-book](https://github.com/alex-shpak/hugo-book) theme. CI builds and deploys it to GitHub Pages on every push to `main`.

To preview docs locally, install Hugo and run the script:

```bash
brew install hugo                # macOS — use scoop / winget / apt as appropriate
./scripts/preview-docs.sh
```

The script fetches the theme on first run, stages `README.md` and `LICENSE` into the site, and starts Hugo's dev server at <http://localhost:1313/> with live reload. All generated files (theme, staged content, build output) are gitignored.
