import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";

export const cancelDocumentConfig = {
  description: "Cancels a pending document",
  inputSchema: z.object({
    document_id: z.string(),
  }),
  annotations: {
    title: "Cancel Document",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export interface CancelDocumentArgs {
  document_id: string;
}

export function cancelDocumentHandler(client: DocumentClient) {
  return async ({ document_id }: CancelDocumentArgs) => {
    try {
      await client.cancelDocument(document_id);
      return {
        isError: false,
        content: [{ type: "text" as const, text: "Document cancelled successfully!" }],
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
