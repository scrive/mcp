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

export const addPartyConfig = {
  description: "Adds a new party to a Scrive document",
  inputSchema: z.object({
    document_id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.enum(["signing_party", "viewer", "approver"]),
    authentication_to_sign: z
      .enum(AUTH_METHODS_TO_SIGN)
      .optional()
      .describe(
        "Authentication method the party must use to sign. eID methods (e.g. se_bankid, no_bankid, dk_mitid, fi_tupas) generally require personal_number; sms_pin requires mobile_number. The account must have the chosen method enabled or start_signing will fail.",
      ),
    authentication_to_view: z
      .enum(AUTH_METHODS_TO_VIEW)
      .optional()
      .describe(
        "Authentication method the party must use to view the document before signing. Same field prerequisites as authentication_to_sign.",
      ),
    authentication_to_view_archived: z
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
    title: "Add Party to Document",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export interface AddPartyArgs {
  document_id: string;
  name: string;
  email: string;
  role: SignatoryRole;
  authentication_to_sign?: AuthenticationMethodToSign;
  authentication_to_view?: AuthenticationMethodToView;
  authentication_to_view_archived?: AuthenticationMethodToView;
  personal_number?: string;
  mobile_number?: string;
}

export function addPartyHandler(client: DocumentClient) {
  return async (args: AddPartyArgs) => {
    try {
      const document = await client.getDocument(args.document_id);
      const parties: ScriveParty[] = Array.isArray(document.parties) ? [...document.parties] : [];

      const [firstName, ...rest] = args.name.split(" ");
      const lastName = rest.join(" ");

      const fields: ScriveField[] = [
        { type: "name", value: firstName, order: 1 },
        { type: "name", value: lastName, order: 2 },
        { type: "email", value: args.email },
      ];
      if (args.personal_number) {
        fields.push({ type: "personal_number", value: args.personal_number });
      }
      if (args.mobile_number) {
        fields.push({ type: "mobile", value: args.mobile_number });
      }

      const party: ScriveParty = {
        signatory_role: args.role,
        authentication_method_to_sign: args.authentication_to_sign,
        authentication_method_to_view: args.authentication_to_view,
        authentication_method_to_view_archived: args.authentication_to_view_archived,
        fields,
      };

      parties.push(party);

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
