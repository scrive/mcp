# scrive-mcp

A [Model Context Protocol](https://modelcontextprotocol.io/) server in TypeScript that integrates with [Scrive](https://www.scrive.com/) for document automation.

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

Run the interactive auth setup:

```bash
node dist/index.js auth
```

This prompts for your Scrive server, email, and password, then saves credentials to `~/.config/scrive-mcp/config.json`.

## Running

### Stdio transport

For local MCP clients:

```bash
node dist/src/index.js stdio
```

### HTTP transport

For remote deployments with bearer-token forwarding:

```bash
export PORT=8080
export AUTH_SERVER_URL=https://oauth2.scrive.com
export SCRIVE_BASE_URL=https://scrive.com
export RESOURCE_URL=https://your-host.example.com/mcp
export SCOPES=full
export ALLOWED_CORS_ORIGINS=https://claude.ai,https://chatgpt.com

node dist/src/index.js http
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

| Tool                       | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `create_document`          | Upload a PDF file from an absolute local path.                      |
| `list_documents`           | List documents with filtering and sorting options.                  |
| `get_document`             | Retrieve a document preview or full JSON payload.                   |
| `add_party`                | Add a signing party to an existing document.                        |
| `start_signing`            | Start the signing flow for a document.                              |
| `remind_document`          | Send reminders to signatories who have not signed yet.              |
| `create_flow_draft`        | Create a new Journey flow draft.                                    |
| `add_document_to_draft`    | Add a PDF document to an existing Journey draft.                    |
| `list_flow_drafts`         | List Journey flow drafts.                                           |
| `get_flow_draft`           | Retrieve a Journey flow draft.                                      |
| `delete_flow_draft`        | Delete a Journey flow draft.                                        |
| `start_flow`               | Start a Journey flow draft.                                         |
| `add_participant_to_draft` | Add a participant to a Journey draft and regenerate steps.          |
| `get_time`                 | Return the current UTC time and render the bundled MCP App example. |

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

## Project Structure

```text
src/commands/    CLI commands (auth, stdio, http)
src/scrive/      Scrive API clients
src/tools/       MCP tool implementations
src/server.ts    MCP server setup and tool/resource registration
tests/           Vitest coverage for config and tool behavior
ui/              Vite-based MCP App example
```
