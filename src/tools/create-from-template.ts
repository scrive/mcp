import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";

export const createFromTemplateConfig = {
  description: "Creates a new document from a template",
  inputSchema: z.object({
    document_id: z.string().min(1).describe("The template's document id"),
  }),
  annotations: {
    title: "Create Document from Template",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export interface CreateFromTemplateArgs {
  document_id: string;
}

export function createFromTemplateHandler(client: DocumentClient) {
  return async ({ document_id }: CreateFromTemplateArgs) => {
    try {
      const document = await client.createFromTemplate(document_id);
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
