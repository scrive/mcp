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
});
