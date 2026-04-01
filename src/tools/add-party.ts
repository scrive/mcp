import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";
import type { SignatoryRole, ScriveParty } from "../scrive/document/types.js";

export const addPartyConfig = {
  description: "Adds a new party to a Scrive document",
  inputSchema: z.object({
    document_id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.enum(["signing_party", "viewer", "approver"]),
  }),
};

export interface AddPartyArgs {
  document_id: string;
  name: string;
  email: string;
  role: SignatoryRole;
}

export function addPartyHandler(client: DocumentClient) {
  return async (args: AddPartyArgs) => {
    try {
      const document = await client.getDocument(args.document_id);
      const parties: ScriveParty[] = Array.isArray(document.parties) ? [...document.parties] : [];

      const [firstName, ...rest] = args.name.split(" ");
      const lastName = rest.join(" ");

      parties.push({
        signatory_role: args.role,
        fields: [
          { type: "name", value: firstName, order: 1 },
          { type: "name", value: lastName, order: 2 },
          { type: "email", value: args.email },
        ],
      });

      document.parties = parties;
      await client.updateDocument(args.document_id, document);
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
