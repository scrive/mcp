import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { downloadDocumentContentHandler } from "../src/tools/download-document-content.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("downloadDocumentContentHandler", () => {
  it("returns the filename and base64 PDF for the app", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/123/get",
        response: { id: "123", sealed_file: { id: "f1", name: "signed.pdf" } },
      },
      {
        method: "GET",
        path: "/api/v2/documents/123/files/main",
        contentType: "application/pdf",
        response: "pdf-bytes",
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = downloadDocumentContentHandler(client);

    const result = await handler({ document_id: "123" });

    expect(result.isError).toBe(false);
    expect(result.structuredContent).toEqual({
      file_name: "signed.pdf",
      file_data: Buffer.from("pdf-bytes").toString("base64"),
    });
  });

  it("returns error when the download fails", async () => {
    const { fetchImpl } = fakeFetch([
      { method: "GET", path: "/api/v2/documents/123/get", response: { id: "123" } },
      {
        method: "GET",
        path: "/api/v2/documents/123/files/main",
        response: { error: "not ready yet" },
        status: 409,
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = downloadDocumentContentHandler(client);

    const result = await handler({ document_id: "123" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not ready yet");
  });
});
