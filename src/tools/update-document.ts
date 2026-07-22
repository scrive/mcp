import { z } from "zod";

import { SCRIVE_LANGUAGES } from "../scrive/document/types.js";
import type { DocumentClient } from "../scrive/document/client.js";
import type { ScriveDocument, ScriveParty } from "../scrive/document/types.js";
import { applyPartyParams, partyParamsSchema } from "./party-params.js";

const documentSchema = z
  .object({
    title: z.string().optional(),
    days_to_sign: z.number().int().min(1).max(365).optional(),
    days_to_remind: z.number().int().nullable().optional(),
    invitation_message: z.string().optional(),
    confirmation_message: z.string().optional(),
    sms_invitation_message: z.string().optional(),
    sms_confirmation_message: z.string().optional(),
    lang: z.enum(SCRIVE_LANGUAGES).optional(),
    api_callback_url: z.string().nullable().optional(),
    timezone: z.string().optional(),
    is_template: z.boolean().optional(),
    tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    display_options: z
      .object({
        show_header: z.boolean().optional(),
        show_pdf_download: z.boolean().optional(),
        show_reject_option: z.boolean().optional(),
        allow_reject_reason: z.boolean().optional(),
        show_footer: z.boolean().optional(),
        document_is_receipt: z.boolean().optional(),
        show_arrow: z.boolean().optional(),
        show_form: z.boolean().optional(),
        show_form_arrow: z.boolean().optional(),
      })
      .optional(),
    parties: z.array(partyParamsSchema).optional(),
  })
  .strict()
  .describe(
    "Partial document metadata; only the provided keys are changed. Providing `parties` replaces the document's party list.",
  );

export const updateDocumentConfig = {
  description: "Updates the metadata of a document in preparation on Scrive.",
  inputSchema: z.object({
    document_id: z.string(),
    document: documentSchema,
  }),
  annotations: {
    title: "Update Document",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

export type UpdateDocumentArgs = z.infer<typeof updateDocumentConfig.inputSchema>;

export function updateDocumentHandler(client: DocumentClient) {
  return async ({ document_id, document }: UpdateDocumentArgs) => {
    try {
      const { parties, ...metadata } = document;
      const payload: Partial<ScriveDocument> = { ...metadata };
      if (parties) {
        payload.parties = parties.map((params) => {
          const party: ScriveParty = { fields: [] };
          applyPartyParams(party, params);
          return party;
        });
      }

      const updated = await client.updateDocument(document_id, payload);
      return {
        isError: false,
        content: [{ type: "text" as const, text: JSON.stringify(updated) }],
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
