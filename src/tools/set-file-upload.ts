import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";

export const setFileUploadConfig = {
  description:
    "Internal: receives a base64-encoded PDF from the file picker UI and sets it as the main file of a document",
  inputSchema: {
    document_id: z.string(),
    file_name: z.string().describe("Original filename of the PDF"),
    file_data: z.string().describe("Base64-encoded PDF content"),
  },
  annotations: {
    title: "Set Document Main File (internal)",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export interface SetFileUploadArgs {
  document_id: string;
  file_name: string;
  file_data: string;
}

export function setFileUploadHandler(client: DocumentClient) {
  return async ({ document_id, file_name, file_data }: SetFileUploadArgs) => {
    try {
      const buffer = Buffer.from(file_data, "base64");
      const file = new File([buffer], file_name, { type: "application/pdf" });
      await client.setFile(document_id, file);

      return {
        isError: false,
        content: [{ type: "text" as const, text: `Main file set on document ${document_id}.` }],
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
