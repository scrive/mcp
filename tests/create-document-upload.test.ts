import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { createDocumentUploadHandler } from "../src/tools/create-document-upload.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("createDocumentUploadHandler", () => {
  it("returns the new document ID on success", async () => {
    const { fetchImpl } = fakeFetch([
      { method: "POST", path: "/api/v2/documents/new", response: { id: "456" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    const handler = createDocumentUploadHandler(client);
    const fileData = Buffer.from("fake-pdf").toString("base64");
    const result = await handler({ file_name: "test.pdf", file_data: fileData });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("456");
  });

  it("returns error when upstream returns an error", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "POST",
        path: "/api/v2/documents/new",
        response: { error: "network fail" },
        status: 500,
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    const handler = createDocumentUploadHandler(client);
    const fileData = Buffer.from("fake-pdf").toString("base64");
    const result = await handler({ file_name: "test.pdf", file_data: fileData });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("network fail");
  });
});
