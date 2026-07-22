import { mkdtemp, realpath, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { setFileHandler } from "../src/tools/set-file.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("setFileHandler", () => {
  it("sets the main file on success", async () => {
    const { fetchImpl } = fakeFetch([
      { method: "POST", path: "/api/v2/documents/123/setfile", response: { id: "123" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), "test-")));
    const filePath = path.join(tmpDir, "test.pdf");
    await writeFile(filePath, "fake-pdf");

    const handler = setFileHandler(client, [tmpDir]);
    const result = await handler({ document_id: "123", file_path: filePath });
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("123");
  });

  it("rejects paths outside allowed directories", async () => {
    const { fetchImpl } = fakeFetch([]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = setFileHandler(client, ["/allowed/dir"]);

    const result = await handler({ document_id: "123", file_path: "/etc/secret.pdf" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Access denied");
  });

  it("rejects when no allowed directories are configured", async () => {
    const { fetchImpl } = fakeFetch([]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = setFileHandler(client, []);

    const result = await handler({ document_id: "123", file_path: "/some/file.pdf" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("no allowed directories");
  });

  it("rejects files that are not PDFs", async () => {
    const { fetchImpl } = fakeFetch([]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = setFileHandler(client, ["/allowed/dir"]);

    const result = await handler({ document_id: "123", file_path: "/allowed/dir/file.txt" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("must be a PDF");
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

    const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), "test-")));
    const filePath = path.join(tmpDir, "test.pdf");
    await writeFile(filePath, "fake-pdf");

    const handler = setFileHandler(client, [tmpDir]);
    const result = await handler({ document_id: "123", file_path: filePath });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("document not in preparation");
  });
});
