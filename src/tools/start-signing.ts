import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";

export const startSigningConfig = {
  description: "Starts the signing process for a document",
  inputSchema: z.object({
    document_id: z.string(),
  }),
  annotations: {
    title: "Start Signing Process",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export interface StartSigningArgs {
  document_id: string;
}

export function startSigningHandler(client: DocumentClient) {
  return async ({ document_id }: StartSigningArgs) => {
    try {
      await client.startSigning(document_id);
      return {
        isError: false,
        content: [
          { type: "text" as const, text: "Document signature process started successfully!" },
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
