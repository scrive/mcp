import { z } from "zod";

import {
  AUTH_METHODS_TO_SIGN,
  AUTH_METHODS_TO_VIEW,
  CONFIRMATION_DELIVERY_METHODS,
  DELIVERY_METHODS,
  NOTIFICATION_DELIVERY_METHODS,
  SCRIVE_FIELD_TYPES,
} from "../scrive/document/types.js";
import type { ScriveField, ScriveParty } from "../scrive/document/types.js";

const placementAnchorSchema = z.object({
  text: z.string().describe("Text in the PDF to anchor the placement to."),
  index: z.number().int().min(1).describe("Which occurrence of the text to anchor to, 1-based."),
  offset: z.object({ x: z.number(), y: z.number() }).optional(),
});

const fieldPlacementSchema = z.object({
  xrel: z
    .number()
    .optional()
    .describe(
      "Left edge as a fraction of page width, 0-1. Give xrel, yrel and page together for a fixed position, or omit all three and position the field with `anchors`.",
    ),
  yrel: z.number().optional().describe("Top edge as a fraction of page height, 0-1."),
  wrel: z.number().describe("Width as a fraction of page width, 0-1."),
  hrel: z.number().describe("Height as a fraction of page height, 0-1."),
  fsrel: z.number().describe("Font size as a fraction of page width."),
  page: z.number().int().min(1).optional().describe("1-based page number."),
  tip: z.enum(["left", "right"]).optional().describe("Side the signing arrow points from."),
  anchors: z
    .array(placementAnchorSchema)
    .optional()
    .describe(
      "Positions the field relative to text in the PDF. Resolved when the document is rendered, so unmatched text is not reported here.",
    ),
});

const dateConfigSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("relative-to-doc-view"),
    value: z.number().int().describe("Number of days from when the document is first viewed."),
  }),
  z.object({
    type: z.literal("absolute"),
    value: z.string().describe("Absolute date as YYYY-MM-DD."),
  }),
]);

const partyFieldSchema = z
  .object({
    type: z.enum(SCRIVE_FIELD_TYPES),
    name: z
      .string()
      .optional()
      .describe(
        "Field name, identifying the field within the party. Required for `text`, `multi_line_text`, `checkbox`, `signature`, `radiogroup` and `date` fields; ignored for the rest.",
      ),
    order: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe("For `name` fields: 1 is the first name, 2 the last name."),
    value: z.string().nullable().optional(),
    is_obligatory: z.boolean().optional().describe("Field must be filled before signing."),
    should_be_filled_by_sender: z
      .boolean()
      .optional()
      .describe("Sender fills this field rather than the signatory."),
    editable_by_signatory: z.boolean().optional(),
    description: z.string().nullable().optional(),
    placements: z
      .array(fieldPlacementSchema)
      .optional()
      .describe(
        "Where the field is drawn on the PDF. Omit for a field with no visual placement. `checkbox` and `radiogroup` placements must use hrel 0, fsrel 0 and an exact wrel — checkbox: 0.011538, 0.021153 or 0.0423076; radiogroup: 0.014736, 0.021052 or 0.025263. A `radiogroup` needs either no placements at all or exactly one per entry in `values`, all on the same page.",
      ),
    is_checked: z.boolean().optional().describe("`checkbox` fields only."),
    values: z
      .array(z.string())
      .optional()
      .describe(
        "`radiogroup` fields only: at least two options, each non-empty and distinct, each needing its own placement.",
      ),
    selected_value: z
      .string()
      .optional()
      .describe("`radiogroup` fields only. Must be one of `values`."),
    custom_validation: z
      .object({
        pattern: z.string(),
        positive_example: z.string(),
        tooltip: z.string(),
      })
      .nullable()
      .optional()
      .describe("`text` fields only."),
    configuration: z
      .object({
        start_date: dateConfigSchema.nullable().optional(),
        end_date: dateConfigSchema.nullable().optional(),
      })
      .nullable()
      .optional()
      .describe("`date` fields only, where it is required. Pass `{}` for no bounds."),
  })
  .strict();

const signatoryAttachmentSchema = z
  .object({
    name: z.string().describe("Name of the attachment the party is asked to upload."),
    description: z.string().describe("Explains to the party what they should upload."),
    required: z
      .boolean()
      .optional()
      .describe("Whether the party must upload it before signing. Defaults to true."),
    add_to_sealed_file: z
      .boolean()
      .optional()
      .describe("Whether the upload is appended to the finalised PDF. Defaults to true."),
  })
  .strict();

export const partyParamsSchema = z.object({
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
  sign_order: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "Signing turn. Parties sharing an order sign in parallel; a higher order is only invited once every lower order has signed.",
    ),
  delivery_method: z
    .enum(DELIVERY_METHODS)
    .optional()
    .describe(
      "How the signing invitation reaches the party. `mobile` and `email_mobile` need mobile_number.",
    ),
  confirmation_delivery_method: z
    .enum(CONFIRMATION_DELIVERY_METHODS)
    .optional()
    .describe("How the post-signing confirmation reaches the party."),
  notification_delivery_method: z
    .enum(NOTIFICATION_DELIVERY_METHODS)
    .optional()
    .describe("How reminders reach the party."),
  allows_highlighting: z
    .boolean()
    .optional()
    .describe("Party may highlight areas of the main PDF while signing."),
  hide_personal_number: z
    .boolean()
    .optional()
    .describe("Hide the party's personal number on the finalised document."),
  can_forward: z
    .boolean()
    .optional()
    .describe("Party may forward the signing process to someone else."),
  is_visible: z
    .boolean()
    .nullable()
    .optional()
    .describe(
      "Whether the party is visible to others. Only for viewers and approvers — a signing party must have this as null, so pass null when turning a viewer or approver back into a signing party.",
    ),
  sign_success_redirect_url: z
    .string()
    .nullable()
    .optional()
    .describe("URL the party is redirected to after signing."),
  reject_redirect_url: z
    .string()
    .nullable()
    .optional()
    .describe("URL the party is redirected to after rejecting."),
  attachments: z
    .array(signatoryAttachmentSchema)
    .optional()
    .describe(
      "Files this party is asked to upload before signing, replacing the party's current list. The uploaded `file_id` and `file_name` are read-only and are not accepted here.",
    ),
  fields: z
    .array(partyFieldSchema)
    .optional()
    .describe(
      "The party's full field list, replacing whatever it has now — pass the existing fields plus your changes, not just the changed ones. `name`, `email`, `mobile_number` and `personal_number` are applied on top of this list, so they win for those field types.",
    ),
});

export type PartyParams = z.infer<typeof partyParamsSchema>;

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

export function applyPartyParams(party: ScriveParty, params: PartyParams): void {
  const { name, email, personal_number, mobile_number, ...properties } = params;
  Object.assign(party, properties);

  if (properties.signatory_role !== undefined) {
    delete party.is_signatory;
  }

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
}
