import { z } from "zod";

import { SCRIVE_LANGUAGES } from "../scrive/document/types.js";
import type { DocumentClient } from "../scrive/document/client.js";
import type { ScriveDocument, ScriveParty } from "../scrive/document/types.js";
import { applyPartyParams, partyParamsSchema } from "./party-params.js";

const partyEntrySchema = partyParamsSchema
  .extend({
    id: z
      .string()
      .optional()
      .describe(
        "Existing party id, as returned by get_document. Carries that party's current data forward as the baseline for this entry.",
      ),
  })
  .strict();

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
    is_template: z
      .boolean()
      .optional()
      .describe(
        "Set true to turn the document into a template. One-way: passing false does not turn a template back into a document, it is silently ignored.",
      ),
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
    parties: z.array(partyEntrySchema).optional(),
  })
  .strict()
  .describe(
    "Partial document metadata; only the provided keys are changed. Providing `parties` replaces the document's party list: parties are matched to the document positionally, entries you omit are removed, and the first entry is always the author. Give an entry an `id` to carry that existing party's data forward and change only the params you pass — without an `id` the entry is built from scratch, so any attribute you do not pass (remaining fields, their placements, sign_order, delivery_method) is cleared. The author's name and email cannot be changed and are ignored.",
  );

export const updateDocumentConfig = {
  description: "Updates the metadata of a document in preparation on Scrive.",
  inputSchema: z.object({
    document_id: z.string(),
    document: documentSchema,
    object_version: z
      .number()
      .int()
      .optional()
      .describe(
        "The document's `object_version` as you last saw it. The update is rejected with a 409 if the document has changed since, which prevents overwriting someone else's concurrent edit.",
      ),
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
  return async ({ document_id, document, object_version }: UpdateDocumentArgs) => {
    try {
      const { parties, ...metadata } = document;
      const payload: Partial<ScriveDocument> = { ...metadata };
      let fetchedVersion: number | undefined;
      if (parties) {
        const carriedIds = parties.filter((entry) => entry.id !== undefined);
        const existing = carriedIds.length > 0 ? await client.getDocument(document_id) : undefined;
        fetchedVersion = existing?.object_version;

        payload.parties = parties.map(({ id, ...params }) => {
          if (id === undefined) {
            const party: ScriveParty = { fields: [] };
            applyPartyParams(party, params);
            return party;
          }

          const base = existing?.parties?.find((party) => party.id === id);
          if (!base) {
            throw new Error(`No party with id "${id}" found on document ${document_id}.`);
          }

          applyPartyParams(base, params);
          return base;
        });
      }

      const updated = await client.updateDocument(
        document_id,
        payload,
        object_version ?? fetchedVersion,
      );
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
