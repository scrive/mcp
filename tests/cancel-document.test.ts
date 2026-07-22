import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { cancelDocumentHandler } from "../src/tools/cancel-document.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("cancelDocumentHandler", () => {
  it("cancels a document", async () => {
    const { fetchImpl } = fakeFetch([
      { method: "POST", path: "/api/v2/documents/doc-1/cancel", response: {} },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = cancelDocumentHandler(client);

    const result = await handler({ document_id: "doc-1" });
    expect(result.isError).toBe(false);
  });
});
