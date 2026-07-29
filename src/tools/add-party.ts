import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";
import type { ScriveParty } from "../scrive/document/types.js";
import { applyPartyParams, partyParamsSchema } from "./party-params.js";

export const addPartyConfig = {
  description: "Adds a new party to a Scrive document",
  inputSchema: partyParamsSchema.extend({ document_id: z.string() }).required({
    name: true,
    email: true,
    signatory_role: true,
  }),
  annotations: {
    title: "Add Party to Document",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export type AddPartyArgs = z.infer<typeof addPartyConfig.inputSchema>;

export function addPartyHandler(client: DocumentClient) {
  return async (args: AddPartyArgs) => {
    try {
      const { document_id, ...params } = args;

      const document = await client.getDocument(document_id);
      const party: ScriveParty = { fields: [] };
      applyPartyParams(party, params);
      document.parties = [...(document.parties ?? []), party];

      await client.updateDocument(document_id, document);
      return {
        isError: false,
        content: [{ type: "text" as const, text: "Party added successfully." }],
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
