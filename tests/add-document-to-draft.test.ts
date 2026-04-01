import { mkdtemp, realpath, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { JourneyClient } from "../src/scrive/journey/client.js";
import { addDocumentToDraftHandler } from "../src/tools/add-document-to-draft.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("addDocumentToDraftHandler", () => {
  it("derives document name from filename", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "POST",
        path: "/journey/external/drafts/draft-1/documents",
        response: { id: "doc-1" },
      },
    ]);
    const client = new JourneyClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), "test-")));
    const filePath = path.join(tmpDir, "contract.pdf");
    await writeFile(filePath, "fake-pdf");

    const handler = addDocumentToDraftHandler(client, [tmpDir]);
    await handler({ file_path: filePath, draft_id: "draft-1" });
    const body = JSON.parse(requests[0].body as string);
    expect(body.name).toBe("contract");
  });

  it("uses provided name over filename", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "POST",
        path: "/journey/external/drafts/draft-1/documents",
        response: { id: "doc-1" },
      },
    ]);
    const client = new JourneyClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    const tmpDir = await realpath(await mkdtemp(path.join(os.tmpdir(), "test-")));
    const filePath = path.join(tmpDir, "contract.pdf");
    await writeFile(filePath, "fake-pdf");

    const handler = addDocumentToDraftHandler(client, [tmpDir]);
    await handler({ file_path: filePath, draft_id: "draft-1", name: "Custom Name" });
    const body = JSON.parse(requests[0].body as string);
    expect(body.name).toBe("Custom Name");
  });
});
