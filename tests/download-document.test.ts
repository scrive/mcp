import { mkdtemp, readFile, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { downloadDocumentHandler } from "../src/tools/download-document.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

function client(fetchImpl: typeof fetch): DocumentClient {
  return new DocumentClient({ baseUrl: "http://test", authHeader: "test-auth", fetchImpl });
}

describe("downloadDocumentHandler", () => {
  it("writes the PDF using the document's filename", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/123/get",
        response: { id: "123", sealed_file: { id: "f1", name: "signed-contract.pdf" } },
      },
      {
        method: "GET",
        path: "/api/v2/documents/123/files/main",
        contentType: "application/pdf",
        response: "fake-pdf-bytes",
      },
    ]);

    const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), "test-")));
    const handler = downloadDocumentHandler(client(fetchImpl), [tmpDir]);
    const result = await handler({ document_id: "123", output_dir: tmpDir });

    expect(result.isError).toBe(false);
    const target = path.join(tmpDir, "signed-contract.pdf");
    expect(result.content[0].text).toContain(target);
    expect(await readFile(target, "utf8")).toBe("fake-pdf-bytes");
  });

  it("falls back to the title when there is no file name", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/123/get",
        response: { id: "123", title: "My Agreement" },
      },
      {
        method: "GET",
        path: "/api/v2/documents/123/files/main",
        contentType: "application/pdf",
        response: "bytes",
      },
    ]);

    const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), "test-")));
    const handler = downloadDocumentHandler(client(fetchImpl), [tmpDir]);
    const result = await handler({ document_id: "123" });

    expect(result.isError).toBe(false);
    expect(await readFile(path.join(tmpDir, "My Agreement.pdf"), "utf8")).toBe("bytes");
  });

  it("defaults to the first allowed directory when output_dir is omitted", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/123/get",
        response: { id: "123", file: { id: "f1", name: "draft.pdf" } },
      },
      {
        method: "GET",
        path: "/api/v2/documents/123/files/main",
        contentType: "application/pdf",
        response: "bytes",
      },
    ]);

    const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), "test-")));
    const handler = downloadDocumentHandler(client(fetchImpl), [tmpDir]);
    const result = await handler({ document_id: "123" });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain(path.join(tmpDir, "draft.pdf"));
  });

  it("appends a counter instead of overwriting an existing file", async () => {
    const documentRoute = {
      method: "GET",
      path: "/api/v2/documents/123/get",
      response: { id: "123", sealed_file: { id: "f1", name: "signed.pdf" } },
    };
    const fileRoute = {
      method: "GET",
      path: "/api/v2/documents/123/files/main",
      contentType: "application/pdf",
    };
    const { fetchImpl } = fakeFetch([
      documentRoute,
      { ...fileRoute, response: "first" },
      documentRoute,
      { ...fileRoute, response: "second" },
    ]);

    const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), "test-")));
    const handler = downloadDocumentHandler(client(fetchImpl), [tmpDir]);
    await handler({ document_id: "123" });
    const result = await handler({ document_id: "123" });

    expect(result.isError).toBe(false);
    expect(await readFile(path.join(tmpDir, "signed.pdf"), "utf8")).toBe("first");
    expect(await readFile(path.join(tmpDir, "signed (1).pdf"), "utf8")).toBe("second");
  });

  it("rejects an output_dir outside the allowed directories", async () => {
    const { fetchImpl } = fakeFetch([]);
    const handler = downloadDocumentHandler(client(fetchImpl), ["/allowed/dir"]);

    const result = await handler({ document_id: "123", output_dir: "/etc" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Access denied");
  });

  it("returns error when the download fails", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/123/get",
        response: { id: "123", file: { id: "f1", name: "draft.pdf" } },
      },
      {
        method: "GET",
        path: "/api/v2/documents/123/files/main",
        response: { error: "The sealed PDF for the document is not ready yet" },
        status: 409,
      },
    ]);

    const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), "test-")));
    const handler = downloadDocumentHandler(client(fetchImpl), [tmpDir]);
    const result = await handler({ document_id: "123", output_dir: tmpDir });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not ready yet");
  });
});
