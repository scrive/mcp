import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";

export const getDocumentConfig = {
  description: "Retrieves a document's full JSON representation",
  inputSchema: z.object({
    document_id: z.string().min(1),
  }),
};

export interface GetDocumentArgs {
  document_id: string;
}

export function getDocumentHandler(client: DocumentClient) {
  return async ({ document_id }: GetDocumentArgs) => {
    try {
      const document = await client.getDocument(document_id);

      return {
        isError: false,
        content: [{ type: "text" as const, text: JSON.stringify(document) }],
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
