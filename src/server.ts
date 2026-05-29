import { createHash } from "node:crypto";

import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import fileUploadHtml from "#ui/file-upload/app.html?raw";

import type { DocumentClient } from "./scrive/document/client.js";
import type { JourneyClient } from "./scrive/journey/client.js";
import {
  addDocumentToDraftConfig,
  addDocumentToDraftHandler,
} from "./tools/add-document-to-draft.js";
import {
  addDocumentToDraftUploadConfig,
  addDocumentToDraftUploadHandler,
} from "./tools/add-document-to-draft-upload.js";
import {
  addParticipantToDraftConfig,
  addParticipantToDraftHandler,
} from "./tools/add-participant-to-draft.js";
import { addPartyConfig, addPartyHandler } from "./tools/add-party.js";
import { createDocumentConfig, createDocumentHandler } from "./tools/create-document.js";
import {
  createDocumentUploadConfig,
  createDocumentUploadHandler,
} from "./tools/create-document-upload.js";
import { createFlowDraftConfig, createFlowDraftHandler } from "./tools/create-flow-draft.js";
import { deleteFlowDraftConfig, deleteFlowDraftHandler } from "./tools/delete-flow-draft.js";
import { getDocumentConfig, getDocumentHandler } from "./tools/get-document.js";
import { getFlowDraftConfig, getFlowDraftHandler } from "./tools/get-flow-draft.js";
import { getUsageStatsConfig, getUsageStatsHandler } from "./tools/get-usage-stats.js";

import { listDocumentsConfig, listDocumentsHandler } from "./tools/list-documents.js";
import { listFlowDraftsConfig, listFlowDraftsHandler } from "./tools/list-flow-drafts.js";
import { remindDocumentConfig, remindDocumentHandler } from "./tools/remind-document.js";
import { startFlowConfig, startFlowHandler } from "./tools/start-flow.js";
import { startSigningConfig, startSigningHandler } from "./tools/start-signing.js";

export interface ServerDependencies {
  documentClient: DocumentClient;
  journeyClient: JourneyClient;
  allowedDirectories: string[];
  isRemote: boolean;
}

export function createServer(dependencies: ServerDependencies): McpServer {
  const server = new McpServer({
    name: "scrive-mcp",
    version: __VERSION__,
  });

  const { documentClient, journeyClient, allowedDirectories, isRemote } = dependencies;

  if (!isRemote) {
    server.registerTool(
      "create_document",
      createDocumentConfig,
      createDocumentHandler(documentClient, allowedDirectories),
    );

    server.registerTool(
      "add_document_to_draft",
      addDocumentToDraftConfig,
      addDocumentToDraftHandler(journeyClient, allowedDirectories),
    );
  }

  const registerPickerTools = () => {
    // When path-based tools occupy the base names (stdio mode), the picker
    // tools take a suffixed name so both flavors can coexist.
    const pickerName = (base: string) => (isRemote ? base : `${base}_picker`);

    registerAppTool(
      server,
      pickerName("create_document"),
      {
        description:
          "Uploads a PDF file to Scrive as a new document. Opens a file picker for the user to select the PDF.",
        annotations: {
          title: "Create Document from File",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
        _meta: { ui: { resourceUri: fileUploadResourceUri } },
      },
      async () => ({
        content: [
          { type: "text" as const, text: "Please select a PDF file using the file picker." },
        ],
      }),
    );

    registerAppTool(
      server,
      pickerName("add_document_to_draft"),
      {
        description:
          "Adds one or more PDF documents to an existing Journey flow draft. Opens a file picker for the user to select PDFs.",
        inputSchema: {
          draft_id: z.string(),
          name: z.string().optional(),
        },
        annotations: {
          title: "Add Document to Flow Draft",
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
        _meta: { ui: { resourceUri: fileUploadResourceUri } },
      },
      async ({ draft_id, name }: { draft_id: string; name?: string }) => ({
        content: [
          {
            type: "text" as const,
            text: `Please select one or more PDF files to add to draft ${draft_id}${name ? ` as "${name}"` : ""}.`,
          },
        ],
      }),
    );

    registerAppTool(
      server,
      "_create_document_upload",
      {
        ...createDocumentUploadConfig,
        _meta: { ui: { resourceUri: fileUploadResourceUri, visibility: ["app"] as const } },
      },
      createDocumentUploadHandler(documentClient),
    );

    registerAppTool(
      server,
      "_add_document_to_draft_upload",
      {
        ...addDocumentToDraftUploadConfig,
        _meta: { ui: { resourceUri: fileUploadResourceUri, visibility: ["app"] as const } },
      },
      addDocumentToDraftUploadHandler(journeyClient),
    );
  };

  // Register the UI resource eagerly so the SDK installs the resource request
  // handlers before the transport connects — Server.registerCapabilities throws
  // post-connect, which swallows any later registerResource() call.
  registerAppResource(server, "file_upload_ui", fileUploadResourceUri, {}, async () => ({
    contents: [
      {
        uri: fileUploadResourceUri,
        mimeType: RESOURCE_MIME_TYPE,
        text: fileUploadHtml,
      },
    ],
  }));

  // Register picker tools unconditionally — Claude.ai does not advertise the
  // experimental `ui` capability, so gating on it hides the tools from the
  // primary target client. Non-UI clients that pick these up will simply see a
  // tool that responds with an instructional text message.
  registerPickerTools();

  server.registerTool("list_documents", listDocumentsConfig, listDocumentsHandler(documentClient));

  server.registerTool("get_document", getDocumentConfig, getDocumentHandler(documentClient));

  server.registerTool("add_party", addPartyConfig, addPartyHandler(documentClient));

  server.registerTool("start_signing", startSigningConfig, startSigningHandler(documentClient));

  server.registerTool(
    "remind_document",
    remindDocumentConfig,
    remindDocumentHandler(documentClient),
  );

  server.registerTool("get_usage_stats", getUsageStatsConfig, getUsageStatsHandler(documentClient));

  server.registerTool(
    "create_flow_draft",
    createFlowDraftConfig,
    createFlowDraftHandler(journeyClient),
  );

  server.registerTool(
    "list_flow_drafts",
    listFlowDraftsConfig,
    listFlowDraftsHandler(journeyClient),
  );

  server.registerTool("get_flow_draft", getFlowDraftConfig, getFlowDraftHandler(journeyClient));

  server.registerTool(
    "delete_flow_draft",
    deleteFlowDraftConfig,
    deleteFlowDraftHandler(journeyClient),
  );

  server.registerTool("start_flow", startFlowConfig, startFlowHandler(journeyClient));

  server.registerTool(
    "add_participant_to_draft",
    addParticipantToDraftConfig,
    addParticipantToDraftHandler(journeyClient),
  );

  return server;
}

// MCP App cache busting — hashing once per module load seemed like the best
// option for now.
const fileUploadHash = createHash("sha256").update(fileUploadHtml).digest("hex").slice(0, 12);
const fileUploadResourceUri = `ui://file_upload/${fileUploadHash}/app.html`;
