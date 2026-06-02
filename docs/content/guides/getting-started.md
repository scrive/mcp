---
title: Get started
weight: 1
---

# Get started

The Scrive MCP server connects MCP clients to Scrive's document automation platform. You run it on your own machine — over stdio for local clients such as Claude Desktop, or as an HTTP server (`scrive-mcp http`) for clients that connect over HTTP.

This guide covers the stdio setup with Claude Desktop.

## Configuring Claude Desktop

### 1. Install the package

The package is published to the public npm registry, so no authentication is required.

```sh
npm install -g @scrive_ab/mcp
```

This installs the `scrive-mcp` command globally.

### 2. Authenticate

Run:

```sh
scrive-mcp auth
```

The command prompts for your Scrive server, your account email, and your password (the password is masked as you type). It exchanges them for personal access credentials and saves them to a well-known location on your hard drive.

### 3. Configure Claude Desktop

Edit Claude Desktop's config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add a `scrive` entry under `mcpServers`. After `stdio`, list one or more directories the server is allowed to read PDFs from — tools that take a local file path (such as `create_document`) reject paths outside this list. `~` is expanded.

```json
{
  "mcpServers": {
    "scrive": {
      "command": "scrive-mcp",
      "args": ["stdio", "~/Documents", "~/Downloads"]
    }
  }
}
```

Restart Claude Desktop. The Scrive tools appear in the tool list (look for the hammer icon).

### 4. Verify

Ask Claude _"List my Scrive documents"_. The `list_documents` tool runs and returns your documents.
