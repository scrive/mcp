import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { getDocumentHandler } from "../src/tools/get-document.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("getDocumentHandler", () => {
  it("returns the full document JSON", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/doc-1/get",
        response: {
          id: "doc-1",
          title: "Contract",
          status: "pending",
          parties: [
            {
              signatory_role: "signing_party",
              fields: [
                { type: "email", value: "test@test.com" },
                { type: "full_name", value: "Alice" },
              ],
            },
          ],
        },
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = getDocumentHandler(client);

    const result = await handler({ document_id: "doc-1" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe("doc-1");
    expect(parsed.title).toBe("Contract");
    expect(parsed.status).toBe("pending");
    expect(parsed.parties[0].signatory_role).toBe("signing_party");
    expect(parsed.parties[0].fields[0].value).toBe("test@test.com");
  });
});
