import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { addPartyHandler } from "../src/tools/add-party.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("addPartyHandler", () => {
  it("adds a party with the correct role", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/doc-1/get",
        response: {
          id: "doc-1",
          parties: [{ signatory_role: "viewer", fields: [] }],
        },
      },
      {
        method: "POST",
        path: "/api/v2/documents/doc-1/update",
        response: { id: "doc-1" },
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = addPartyHandler(client);

    await handler({
      document_id: "doc-1",
      name: "Alice",
      email: "alice@test.com",
      signatory_role: "signing_party",
    });

    const updateBody = requests[1].body as URLSearchParams;
    const sentDoc = JSON.parse(updateBody.get("document")!);
    expect(sentDoc.parties).toHaveLength(2);
    expect(sentDoc.parties[1].signatory_role).toBe("signing_party");
  });

  it("sets authentication methods and identity fields only when provided", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/doc-1/get",
        response: { id: "doc-1", parties: [] },
      },
      {
        method: "POST",
        path: "/api/v2/documents/doc-1/update",
        response: { id: "doc-1" },
      },
      {
        method: "GET",
        path: "/api/v2/documents/doc-1/get",
        response: { id: "doc-1", parties: [] },
      },
      {
        method: "POST",
        path: "/api/v2/documents/doc-1/update",
        response: { id: "doc-1" },
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = addPartyHandler(client);

    await handler({
      document_id: "doc-1",
      name: "Alice",
      email: "alice@test.com",
      signatory_role: "signing_party",
    });

    const withoutAuth = JSON.parse((requests[1].body as URLSearchParams).get("document")!)
      .parties[0];
    expect(withoutAuth.authentication_method_to_sign).toBeUndefined();
    expect(withoutAuth.authentication_method_to_view).toBeUndefined();
    expect(withoutAuth.authentication_method_to_view_archived).toBeUndefined();
    expect(withoutAuth.fields.some((f: { type: string }) => f.type === "personal_number")).toBe(
      false,
    );
    expect(withoutAuth.fields.some((f: { type: string }) => f.type === "mobile")).toBe(false);

    await handler({
      document_id: "doc-1",
      name: "Bob Builder",
      email: "bob@test.com",
      signatory_role: "signing_party",
      authentication_method_to_sign: "se_bankid",
      authentication_method_to_view: "sms_pin",
      authentication_method_to_view_archived: "se_bankid",
      personal_number: "199001011234",
      mobile_number: "+46700000000",
    });

    const withAuth = JSON.parse((requests[3].body as URLSearchParams).get("document")!).parties[0];
    expect(withAuth.authentication_method_to_sign).toBe("se_bankid");
    expect(withAuth.authentication_method_to_view).toBe("sms_pin");
    expect(withAuth.authentication_method_to_view_archived).toBe("se_bankid");
    const personalNumber = withAuth.fields.find(
      (f: { type: string }) => f.type === "personal_number",
    );
    const mobile = withAuth.fields.find((f: { type: string }) => f.type === "mobile");
    expect(personalNumber.value).toBe("199001011234");
    expect(mobile.value).toBe("+46700000000");
  });
});
