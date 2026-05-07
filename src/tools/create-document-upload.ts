import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";

export const createDocumentUploadConfig = {
  description:
    "Internal: receives a base64-encoded PDF from the file picker UI and uploads it to Scrive",
  inputSchema: {
    file_name: z.string().describe("Original filename of the PDF"),
    file_data: z.string().describe("Base64-encoded PDF content"),
  },
  annotations: {
    title: "Upload Document (internal)",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export interface CreateDocumentUploadArgs {
  file_name: string;
  file_data: string;
}

export function createDocumentUploadHandler(client: DocumentClient) {
  return async ({ file_name, file_data }: CreateDocumentUploadArgs) => {
    try {
      const buffer = Buffer.from(file_data, "base64");
      const file = new File([buffer], file_name, { type: "application/pdf" });
      const document = await client.createDocument(file);

      return {
        isError: false,
        content: [
          { type: "text" as const, text: `Document created successfully with ID: ${document.id}` },
        ],
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
