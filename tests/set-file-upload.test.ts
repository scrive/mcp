import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { setFileUploadHandler } from "../src/tools/set-file-upload.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("setFileUploadHandler", () => {
  it("sets the main file on success", async () => {
    const { fetchImpl } = fakeFetch([
      { method: "POST", path: "/api/v2/documents/123/setfile", response: { id: "123" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    const handler = setFileUploadHandler(client);
    const fileData = Buffer.from("fake-pdf").toString("base64");
    const result = await handler({
      document_id: "123",
      file_name: "test.pdf",
      file_data: fileData,
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("123");
  });

  it("returns error when upstream returns an error", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "POST",
        path: "/api/v2/documents/123/setfile",
        response: { error: "document not in preparation" },
        status: 409,
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    const handler = setFileUploadHandler(client);
    const fileData = Buffer.from("fake-pdf").toString("base64");
    const result = await handler({
      document_id: "123",
      file_name: "test.pdf",
      file_data: fileData,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("document not in preparation");
  });
});
