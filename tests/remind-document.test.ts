import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { remindDocumentHandler } from "../src/tools/remind-document.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("remindDocumentHandler", () => {
  it("sends a reminder", async () => {
    const { fetchImpl } = fakeFetch([
      { method: "POST", path: "/api/v2/documents/doc-1/remind", response: {} },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = remindDocumentHandler(client);

    const result = await handler({ document_id: "doc-1" });
    expect(result.isError).toBe(false);
  });
});
