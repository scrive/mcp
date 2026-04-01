import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { startSigningHandler } from "../src/tools/start-signing.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("startSigningHandler", () => {
  it("starts the signing process", async () => {
    const { fetchImpl } = fakeFetch([
      { method: "POST", path: "/api/v2/documents/doc-1/start", response: {} },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = startSigningHandler(client);

    const result = await handler({ document_id: "doc-1" });
    expect(result.isError).toBe(false);
  });
});
