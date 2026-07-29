import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { updateDocumentHandler } from "../src/tools/update-document.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("updateDocumentHandler", () => {
  it("posts the partial document metadata and returns the updated document", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "POST",
        path: "/api/v2/documents/doc-1/update",
        response: { id: "doc-1", title: "New title" },
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = updateDocumentHandler(client);

    const result = await handler({
      document_id: "doc-1",
      document: { title: "New title" },
    });

    expect(result.isError).toBe(false);
    expect(requests[0].url.pathname).toBe("/api/v2/documents/doc-1/update");
    const body = requests[0].body as URLSearchParams;
    expect(body.get("document_id")).toBe("doc-1");
    expect(JSON.parse(body.get("document")!)).toEqual({ title: "New title" });
    expect(JSON.parse(result.content[0].text)).toEqual({ id: "doc-1", title: "New title" });
  });

  it("returns error when upstream returns an error", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "POST",
        path: "/api/v2/documents/doc-1/update",
        response: { error: "document not in preparation" },
        status: 409,
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = updateDocumentHandler(client);

    const result = await handler({ document_id: "doc-1", document: { title: "New title" } });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("document not in preparation");
  });

  it("translates party params into the wire party shape", async () => {
    const { fetchImpl, requests } = fakeFetch([
      { method: "POST", path: "/api/v2/documents/doc-1/update", response: { id: "doc-1" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = updateDocumentHandler(client);

    await handler({
      document_id: "doc-1",
      document: { parties: [{ signatory_role: "signing_party", email: "a@b.com" }] },
    });

    const body = requests[0].body as URLSearchParams;
    const sent = JSON.parse(body.get("document")!);
    expect(sent.parties[0].signatory_role).toBe("signing_party");
    expect(sent.parties[0].fields).toContainEqual({ type: "email", value: "a@b.com" });
  });

  it("does not fetch the document when no party entry carries an id", async () => {
    const { fetchImpl, requests } = fakeFetch([
      { method: "POST", path: "/api/v2/documents/doc-1/update", response: { id: "doc-1" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    await updateDocumentHandler(client)({
      document_id: "doc-1",
      document: { parties: [{ signatory_role: "viewer" }] },
    });

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
  });

  it("carries an existing party forward when the entry has an id", async () => {
    const existingParty = {
      id: "party-1",
      is_author: true,
      is_signatory: true,
      signatory_role: "signing_party",
      sign_order: 3,
      delivery_method: "email",
      fields: [
        { type: "name", order: 1, value: "Ada" },
        { type: "name", order: 2, value: "Lovelace" },
        { type: "email", value: "ada@example.com" },
        { type: "company", value: "Acme" },
        {
          type: "signature",
          placements: [{ xrel: 0.1, yrel: 0.2, wrel: 0.3, hrel: 0.4, fsrel: 0.05, page: 1 }],
        },
      ],
    };
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/doc-1/get",
        response: { id: "doc-1", parties: [existingParty] },
      },
      { method: "POST", path: "/api/v2/documents/doc-1/update", response: { id: "doc-1" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    const result = await updateDocumentHandler(client)({
      document_id: "doc-1",
      document: { parties: [{ id: "party-1", authentication_method_to_sign: "se_bankid" }] },
    });

    expect(result.isError).toBe(false);
    const sent = JSON.parse((requests[1].body as URLSearchParams).get("document")!);
    const sentParty = sent.parties[0];

    expect(sentParty.authentication_method_to_sign).toBe("se_bankid");
    expect(sentParty.signatory_role).toBe("signing_party");
    expect(sentParty.sign_order).toBe(3);
    expect(sentParty.fields).toEqual(existingParty.fields);
  });

  it("sends an explicitly supplied object_version", async () => {
    const { fetchImpl, requests } = fakeFetch([
      { method: "POST", path: "/api/v2/documents/doc-1/update", response: { id: "doc-1" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    await updateDocumentHandler(client)({
      document_id: "doc-1",
      document: { title: "Guarded" },
      object_version: 12,
    });

    expect((requests[0].body as URLSearchParams).get("object_version")).toBe("12");
  });

  it("omits object_version when neither supplied nor fetched", async () => {
    const { fetchImpl, requests } = fakeFetch([
      { method: "POST", path: "/api/v2/documents/doc-1/update", response: { id: "doc-1" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    await updateDocumentHandler(client)({ document_id: "doc-1", document: { title: "Unguarded" } });

    expect((requests[0].body as URLSearchParams).has("object_version")).toBe(false);
  });

  it("guards the carry-forward round trip with the fetched object_version", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/doc-1/get",
        response: { id: "doc-1", object_version: 7, parties: [{ id: "party-1", fields: [] }] },
      },
      { method: "POST", path: "/api/v2/documents/doc-1/update", response: { id: "doc-1" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    await updateDocumentHandler(client)({
      document_id: "doc-1",
      document: { parties: [{ id: "party-1", authentication_method_to_sign: "se_bankid" }] },
    });

    expect((requests[1].body as URLSearchParams).get("object_version")).toBe("7");
  });

  it("prefers an explicit object_version over the fetched one", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/doc-1/get",
        response: { id: "doc-1", object_version: 7, parties: [{ id: "party-1", fields: [] }] },
      },
      { method: "POST", path: "/api/v2/documents/doc-1/update", response: { id: "doc-1" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    await updateDocumentHandler(client)({
      document_id: "doc-1",
      document: { parties: [{ id: "party-1" }] },
      object_version: 3,
    });

    expect((requests[1].body as URLSearchParams).get("object_version")).toBe("3");
  });

  it("errors when a carried id is not on the document", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/doc-1/get",
        response: { id: "doc-1", parties: [{ id: "party-1", fields: [] }] },
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    const result = await updateDocumentHandler(client)({
      document_id: "doc-1",
      document: { parties: [{ id: "party-missing" }] },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No party with id "party-missing"');
  });
});
