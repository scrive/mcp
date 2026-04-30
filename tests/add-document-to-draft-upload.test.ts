import { describe, expect, it } from "vitest";

import { JourneyClient } from "../src/scrive/journey/client.js";
import { addDocumentToDraftUploadHandler } from "../src/tools/add-document-to-draft-upload.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("addDocumentToDraftUploadHandler", () => {
  it("forwards base64 data and name to the API", async () => {
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

    const fileData = Buffer.from("fake-pdf").toString("base64");
    const handler = addDocumentToDraftUploadHandler(client);
    const result = await handler({
      draft_id: "draft-1",
      name: "Contract",
      file_name: "contract.pdf",
      file_data: fileData,
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("doc-1");

    const body = JSON.parse(requests[0].body as string);
    expect(body.name).toBe("Contract");
    expect(body.pdf).toBe(fileData);
  });

  it("returns error when upstream returns an error", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "POST",
        path: "/journey/external/drafts/draft-1/documents",
        response: { error: "not found" },
        status: 404,
      },
    ]);
    const client = new JourneyClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    const fileData = Buffer.from("fake-pdf").toString("base64");
    const handler = addDocumentToDraftUploadHandler(client);
    const result = await handler({
      draft_id: "draft-1",
      name: "Contract",
      file_name: "contract.pdf",
      file_data: fileData,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not found");
  });
});
