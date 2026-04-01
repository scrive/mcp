import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { DocumentClient } from "./scrive/document/client.js";
import type { JourneyClient } from "./scrive/journey/client.js";
import { addDocumentToDraftConfig, addDocumentToDraftHandler } from "./tools/add-document-to-draft.js";
import { createFlowDraftConfig, createFlowDraftHandler } from "./tools/create-flow-draft.js";
import { deleteFlowDraftConfig, deleteFlowDraftHandler } from "./tools/delete-flow-draft.js";
import { getFlowDraftConfig, getFlowDraftHandler } from "./tools/get-flow-draft.js";
import { listFlowDraftsConfig, listFlowDraftsHandler } from "./tools/list-flow-drafts.js";
import { startFlowConfig, startFlowHandler } from "./tools/start-flow.js";
import { addPartyConfig, addPartyHandler } from "./tools/add-party.js";
import { createDocumentConfig, createDocumentHandler } from "./tools/create-document.js";
import { getDocumentConfig, getDocumentHandler } from "./tools/get-document.js";
import { getTimeHandler } from "./tools/get-time.js";
import { listDocumentsConfig, listDocumentsHandler } from "./tools/list-documents.js";
import { remindDocumentConfig, remindDocumentHandler } from "./tools/remind-document.js";
import { startSigningConfig, startSigningHandler } from "./tools/start-signing.js";

export interface ServerDependencies {
  documentClient: DocumentClient;
  journeyClient: JourneyClient;
  allowedDirectories: string[];
}

export function createServer(dependencies: ServerDependencies): McpServer {
  const server = new McpServer({
    name: "scrive-mcp",
    version: "0.1.0",
  });

  const { documentClient, journeyClient, allowedDirectories } = dependencies;

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
    "get_document",
    getDocumentConfig,
    getDocumentHandler(documentClient),
  );

  server.registerTool(
    "add_party",
    addPartyConfig,
    addPartyHandler(documentClient),
  );

  server.registerTool(
    "start_signing",
    startSigningConfig,
    startSigningHandler(documentClient),
  );

  server.registerTool(
    "remind_document",
    remindDocumentConfig,
    remindDocumentHandler(documentClient),
  );

  server.registerTool(
    "create_flow_draft",
    createFlowDraftConfig,
    createFlowDraftHandler(journeyClient),
  );

  server.registerTool(
    "add_document_to_draft",
    addDocumentToDraftConfig,
    addDocumentToDraftHandler(journeyClient, allowedDirectories),
  );

  server.registerTool(
    "list_flow_drafts",
    listFlowDraftsConfig,
    listFlowDraftsHandler(journeyClient),
  );

  server.registerTool(
    "get_flow_draft",
    getFlowDraftConfig,
    getFlowDraftHandler(journeyClient),
  );

  server.registerTool(
    "delete_flow_draft",
    deleteFlowDraftConfig,
    deleteFlowDraftHandler(journeyClient),
  );

  server.registerTool(
    "start_flow",
    startFlowConfig,
    startFlowHandler(journeyClient),
  );

  server.registerTool(
    "get_time",
    { description: "Returns the current server time" },
    getTimeHandler(),
  );

  return server;
}
