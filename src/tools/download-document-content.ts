import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";
import { documentFileName } from "./download-document.js";

export const downloadDocumentContentConfig = {
  description:
    "Internal: fetches a document's main PDF as base64 with its filename for the download app",
  inputSchema: {
    document_id: z.string(),
  },
  annotations: {
    title: "Download Document (internal)",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export interface DownloadDocumentContentArgs {
  document_id: string;
}

export function downloadDocumentContentHandler(client: DocumentClient) {
  return async ({ document_id }: DownloadDocumentContentArgs) => {
    try {
      const document = await client.getDocument(document_id);
      const fileName = documentFileName(document);
      const data = await client.downloadMainFile(document_id);
      const fileData = Buffer.from(data).toString("base64");

      return {
        isError: false,
        content: [{ type: "text" as const, text: `Prepared ${fileName} for download.` }],
        structuredContent: { file_name: fileName, file_data: fileData },
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          { type: "text" as const, text: error instanceof Error ? error.message : String(error) },
        ],
      };
    }
  };
}
