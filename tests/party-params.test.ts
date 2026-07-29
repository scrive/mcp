import { describe, expect, it } from "vitest";

import type { ScriveParty } from "../src/scrive/document/types.js";
import { applyPartyParams, partyParamsSchema } from "../src/tools/party-params.js";

describe("applyPartyParams", () => {
  it("assigns the party-level scalars", () => {
    const party: ScriveParty = { fields: [] };

    applyPartyParams(party, {
      sign_order: 3,
      delivery_method: "email_mobile",
      confirmation_delivery_method: "none",
      notification_delivery_method: "mobile",
      allows_highlighting: true,
      hide_personal_number: true,
      can_forward: false,
      sign_success_redirect_url: "https://example.com/done",
      reject_redirect_url: null,
    });

    expect(party.sign_order).toBe(3);
    expect(party.delivery_method).toBe("email_mobile");
    expect(party.confirmation_delivery_method).toBe("none");
    expect(party.notification_delivery_method).toBe("mobile");
    expect(party.allows_highlighting).toBe(true);
    expect(party.hide_personal_number).toBe(true);
    expect(party.can_forward).toBe(false);
    expect(party.sign_success_redirect_url).toBe("https://example.com/done");
    expect(party.reject_redirect_url).toBeNull();
  });

  it("takes explicit fields as the party's field list", () => {
    const party: ScriveParty = { fields: [{ type: "email", value: "old@example.com" }] };

    applyPartyParams(party, {
      fields: [
        {
          type: "signature",
          placements: [{ xrel: 0.1, yrel: 0.2, wrel: 0.3, hrel: 0.05, fsrel: 0.02, page: 2 }],
        },
        { type: "text", name: "Reference", value: "PO-4417", is_obligatory: true },
      ],
    });

    expect(party.fields).toHaveLength(2);
    expect(party.fields?.[0].placements?.[0].page).toBe(2);
    expect(party.fields?.[1]).toMatchObject({ type: "text", name: "Reference", value: "PO-4417" });
  });

  it("applies the name and email shortcuts on top of explicit fields, keeping placements", () => {
    const party: ScriveParty = { fields: [] };

    applyPartyParams(party, {
      name: "Ada Lovelace",
      email: "ada@example.com",
      fields: [
        {
          type: "email",
          value: "stale@example.com",
          placements: [{ xrel: 0.5, yrel: 0.5, wrel: 0.2, hrel: 0.05, fsrel: 0.02, page: 1 }],
        },
      ],
    });

    const emailField = party.fields?.find((field) => field.type === "email");
    expect(emailField?.value).toBe("ada@example.com");
    expect(emailField?.placements).toHaveLength(1);
    expect(party.fields?.find((f) => f.type === "name" && f.order === 1)?.value).toBe("Ada");
    expect(party.fields?.find((f) => f.type === "name" && f.order === 2)?.value).toBe("Lovelace");
  });

  it("drops is_signatory when a role is given", () => {
    const party: ScriveParty = { fields: [], is_signatory: true };

    applyPartyParams(party, { signatory_role: "viewer" });

    expect(party.is_signatory).toBeUndefined();
    expect(party.signatory_role).toBe("viewer");
  });

  it("assigns signatory attachments", () => {
    const party: ScriveParty = { fields: [] };

    applyPartyParams(party, {
      attachments: [
        { name: "ID document", description: "Photo of your passport" },
        { name: "Proof of address", description: "Recent utility bill", required: false },
      ],
    });

    expect(party.attachments).toHaveLength(2);
    expect(party.attachments?.[1]).toMatchObject({ name: "Proof of address", required: false });
  });

  it("rejects the read-only uploaded file id on an attachment", () => {
    const result = partyParamsSchema.safeParse({
      attachments: [{ name: "ID", description: "d", file_id: "123" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects the read-only signature value on a field", () => {
    const result = partyParamsSchema.safeParse({
      fields: [{ type: "signature", name: "Signature", signature: "base64" }],
    });

    expect(result.success).toBe(false);
  });

  it("allows a placement positioned only by anchors", () => {
    const result = partyParamsSchema.safeParse({
      fields: [
        {
          type: "signature",
          name: "Signature",
          placements: [
            { wrel: 0.25, hrel: 0.08, fsrel: 0.02, anchors: [{ text: "Signed by", index: 1 }] },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts null is_visible so a party can be turned back into a signing party", () => {
    const result = partyParamsSchema.safeParse({
      signatory_role: "signing_party",
      is_visible: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejects unknown keys inside a field", () => {
    const result = partyParamsSchema.safeParse({
      fields: [{ type: "email", value: "a@b.com", placemnets: [] }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a field type that is not a Scrive field type", () => {
    expect(partyParamsSchema.safeParse({ fields: [{ type: "nickname" }] }).success).toBe(false);
  });
});
