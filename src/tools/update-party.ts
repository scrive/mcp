import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";
import { AUTH_METHODS_TO_SIGN, AUTH_METHODS_TO_VIEW } from "../scrive/document/types.js";
import type {
  AuthenticationMethodToSign,
  AuthenticationMethodToView,
  ScriveField,
  ScriveParty,
  SignatoryRole,
} from "../scrive/document/types.js";

export const updatePartyConfig = {
  description: "Updates a party's role, name, email, or authentication on a Scrive document.",
  inputSchema: z.object({
    document_id: z.string(),
    party_id: z.string(),
    signatory_role: z.enum(["signing_party", "viewer", "approver"]).optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    authentication_method_to_sign: z
      .enum(AUTH_METHODS_TO_SIGN)
      .optional()
      .describe(
        "Authentication method the party must use to sign. eID methods (e.g. se_bankid, no_bankid, dk_mitid, fi_tupas) generally require personal_number; sms_pin requires mobile_number. The account must have the chosen method enabled or start_signing will fail.",
      ),
    authentication_method_to_view: z
      .enum(AUTH_METHODS_TO_VIEW)
      .optional()
      .describe(
        "Authentication method the party must use to view the document before signing. Same field prerequisites as authentication_method_to_sign.",
      ),
    authentication_method_to_view_archived: z
      .enum(AUTH_METHODS_TO_VIEW)
      .optional()
      .describe(
        "Authentication method the party must use to view the archived (finalised) document.",
      ),
    personal_number: z
      .string()
      .optional()
      .describe(
        "Party's national identification number (SSN), used by eID authentication methods such as se_bankid.",
      ),
    mobile_number: z
      .string()
      .optional()
      .describe(
        "Party's mobile number in E.164 format. Required when sms_pin authentication is used for signing or viewing.",
      ),
  }),
  annotations: {
    title: "Update Party on Document",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

export interface UpdatePartyArgs {
  document_id: string;
  party_id: string;
  signatory_role?: SignatoryRole;
  name?: string;
  email?: string;
  authentication_method_to_sign?: AuthenticationMethodToSign;
  authentication_method_to_view?: AuthenticationMethodToView;
  authentication_method_to_view_archived?: AuthenticationMethodToView;
  personal_number?: string;
  mobile_number?: string;
}

function upsertField(
  party: ScriveParty,
  match: (f: ScriveField) => boolean,
  field: ScriveField,
): void {
  const existing = party.fields!.find(match);
  if (existing) {
    existing.value = field.value;
  } else {
    party.fields!.push(field);
  }
}

export function updatePartyHandler(client: DocumentClient) {
  return async (args: UpdatePartyArgs) => {
    try {
      const {
        document_id,
        party_id,
        name,
        email,
        personal_number,
        mobile_number,
        ...otherProperties
      } = args;

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

      Object.assign(party, otherProperties);

      if (name) {
        const [firstName, ...rest] = name.split(" ");
        upsertField(party, (f) => f.type === "name" && f.order === 1, {
          type: "name",
          value: firstName,
          order: 1,
        });
        upsertField(party, (f) => f.type === "name" && f.order === 2, {
          type: "name",
          value: rest.join(" "),
          order: 2,
        });
      }
      if (email) upsertField(party, (f) => f.type === "email", { type: "email", value: email });
      if (personal_number)
        upsertField(party, (f) => f.type === "personal_number", {
          type: "personal_number",
          value: personal_number,
        });
      if (mobile_number)
        upsertField(party, (f) => f.type === "mobile", { type: "mobile", value: mobile_number });

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
