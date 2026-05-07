import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";

export const remindDocumentConfig = {
  description: "Sends a reminder invitation to all signatories that have not yet signed",
  inputSchema: z.object({
    document_id: z.string(),
  }),
  annotations: {
    title: "Send Document Reminder",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export interface RemindDocumentArgs {
  document_id: string;
}

export function remindDocumentHandler(client: DocumentClient) {
  return async ({ document_id }: RemindDocumentArgs) => {
    try {
      await client.remindDocument(document_id);
      return {
        isError: false,
        content: [
          {
            type: "text" as const,
            text: "Reminder sent to all signatories that have not yet signed.",
          },
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
