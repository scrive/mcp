import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";
import { applyPartyParams, partyParamsSchema } from "./party-params.js";

export const updatePartyConfig = {
  description: "Updates a party's role, name, email, or authentication on a Scrive document.",
  inputSchema: partyParamsSchema.extend({
    document_id: z.string(),
    party_id: z.string(),
  }),
  annotations: {
    title: "Update Party on Document",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

export type UpdatePartyArgs = z.infer<typeof updatePartyConfig.inputSchema>;

export function updatePartyHandler(client: DocumentClient) {
  return async (args: UpdatePartyArgs) => {
    try {
      const { document_id, party_id, ...params } = args;

      const document = await client.getDocument(document_id);
      const party = document.parties?.find((p) => p.id === party_id);

      if (!party) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `No party with id "${party_id}" found on document ${document_id}.`,
            },
          ],
        };
      }

      applyPartyParams(party, params);

      await client.updateDocument(document_id, document);
      return {
        isError: false,
        content: [{ type: "text" as const, text: "Party updated successfully." }],
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
