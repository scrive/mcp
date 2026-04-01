import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { DocumentClient } from "./scrive/document/client.js";
import { createDocumentConfig, createDocumentHandler } from "./tools/create-document.js";
import { getTimeHandler } from "./tools/get-time.js";
import { listDocumentsConfig, listDocumentsHandler } from "./tools/list-documents.js";

export interface ServerDependencies {
  documentClient: DocumentClient;
  allowedDirectories: string[];
}

export function createServer(dependencies: ServerDependencies): McpServer {
  const server = new McpServer({
    name: "scrive-mcp",
    version: "0.1.0",
  });

  const { documentClient, allowedDirectories } = dependencies;

  server.registerTool(
    "create_document",
    createDocumentConfig,
    createDocumentHandler(documentClient, allowedDirectories),
  );

  server.registerTool(
    "list_documents",
    listDocumentsConfig,
    listDocumentsHandler(documentClient),
  );

  server.registerTool(
    "get_time",
    { description: "Returns the current server time" },
    getTimeHandler(),
  );

  return server;
}
