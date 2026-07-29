import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { updatePartyHandler } from "../src/tools/update-party.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("updatePartyHandler", () => {
  it("updates only the provided fields on the matched party, leaving others untouched", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/doc-1/get",
        response: {
          id: "doc-1",
          parties: [
            {
              id: "p-1",
              is_author: true,
              signatory_role: "signing_party",
              authentication_method_to_view: "se_bankid",
              fields: [
                { type: "name", value: "Old", order: 1 },
                { type: "name", value: "Name", order: 2 },
                { type: "email", value: "old@test.com" },
              ],
            },
            { id: "p-2", signatory_role: "signing_party", fields: [] },
          ],
        },
      },
      { method: "POST", path: "/api/v2/documents/doc-1/update", response: { id: "doc-1" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = updatePartyHandler(client);

    const result = await handler({
      document_id: "doc-1",
      party_id: "p-1",
      signatory_role: "viewer",
      name: "New Person",
      email: "new@test.com",
      authentication_method_to_sign: "se_bankid",
      authentication_method_to_view_archived: "standard",
      personal_number: "190101011234",
      mobile_number: "+46700000000",
    });

    expect(result.isError).toBe(false);
    const parties = JSON.parse((requests[1].body as URLSearchParams).get("document")!).parties;
    const party = parties[0];
    expect(party.signatory_role).toBe("viewer");
    expect(party.authentication_method_to_sign).toBe("se_bankid");
    expect(party.authentication_method_to_view_archived).toBe("standard");
    expect(party.authentication_method_to_view).toBe("se_bankid");
    expect(party.fields.find((f: { order?: number }) => f.order === 1).value).toBe("New");
    expect(party.fields.find((f: { order?: number }) => f.order === 2).value).toBe("Person");
    expect(party.fields.find((f: { type: string }) => f.type === "email").value).toBe(
      "new@test.com",
    );
    expect(party.fields.find((f: { type: string }) => f.type === "personal_number").value).toBe(
      "190101011234",
    );
    expect(party.fields.find((f: { type: string }) => f.type === "mobile").value).toBe(
      "+46700000000",
    );
    expect(parties[1].signatory_role).toBe("signing_party");
  });

  it("returns an error when the party is not found", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/doc-1/get",
        response: { id: "doc-1", parties: [{ id: "p-1" }] },
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = updatePartyHandler(client);

    const result = await handler({
      document_id: "doc-1",
      party_id: "missing",
      signatory_role: "viewer",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("missing");
  });

  it("drops is_signatory when changing the role so the role is not overridden by the stale flag", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/doc-1/get",
        response: {
          id: "doc-1",
          parties: [{ id: "p-1", is_signatory: true, signatory_role: "signing_party", fields: [] }],
        },
      },
      { method: "POST", path: "/api/v2/documents/doc-1/update", response: { id: "doc-1" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = updatePartyHandler(client);

    const result = await handler({
      document_id: "doc-1",
      party_id: "p-1",
      signatory_role: "viewer",
    });

    expect(result.isError).toBe(false);
    const party = JSON.parse((requests[1].body as URLSearchParams).get("document")!).parties[0];
    expect(party.signatory_role).toBe("viewer");
    expect(party.is_signatory).toBeUndefined();
  });

  it("leaves is_signatory untouched when the role is not being changed", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/doc-1/get",
        response: {
          id: "doc-1",
          parties: [{ id: "p-1", is_signatory: true, signatory_role: "signing_party", fields: [] }],
        },
      },
      { method: "POST", path: "/api/v2/documents/doc-1/update", response: { id: "doc-1" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = updatePartyHandler(client);

    const result = await handler({
      document_id: "doc-1",
      party_id: "p-1",
      email: "new@test.com",
    });

    expect(result.isError).toBe(false);
    const party = JSON.parse((requests[1].body as URLSearchParams).get("document")!).parties[0];
    expect(party.is_signatory).toBe(true);
  });
});
