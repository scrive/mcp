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
      role: "signing_party",
    });

    const updateBody = requests[1].body as URLSearchParams;
    const sentDoc = JSON.parse(updateBody.get("document")!);
    expect(sentDoc.parties).toHaveLength(2);
    expect(sentDoc.parties[1].signatory_role).toBe("signing_party");
  });
});
