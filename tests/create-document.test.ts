import { mkdtemp, realpath, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { createDocumentHandler } from "../src/tools/create-document.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("createDocumentHandler", () => {
  it("returns the new document ID on success", async () => {
    const { fetchImpl } = fakeFetch([
      { method: "POST", path: "/api/v2/documents/new", response: { id: "123" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), "test-")));
    const filePath = path.join(tmpDir, "test.pdf");
    await writeFile(filePath, "fake-pdf");

    const handler = createDocumentHandler(client, [tmpDir]);
    const result = await handler({ file_path: filePath });
    expect(result.content[0].text).toContain("123");
  });

  it("rejects paths outside allowed directories", async () => {
    const { fetchImpl } = fakeFetch([]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = createDocumentHandler(client, ["/allowed/dir"]);

    const result = await handler({ file_path: "/etc/passwd" });
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
    const handler = createDocumentHandler(client, []);

    const result = await handler({ file_path: "/some/file.pdf" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("no allowed directories");
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

    const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), "test-")));
    const filePath = path.join(tmpDir, "test.pdf");
    await writeFile(filePath, "fake-pdf");

    const handler = createDocumentHandler(client, [tmpDir]);
    const result = await handler({ file_path: filePath });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("network fail");
  });
});
