import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { createFromTemplateHandler } from "../src/tools/create-from-template.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("createFromTemplateHandler", () => {
  it("returns the new document ID on success", async () => {
    const { fetchImpl } = fakeFetch([
      { method: "POST", path: "/api/v2/documents/newfromtemplate/tmpl-1", response: { id: "456" } },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = createFromTemplateHandler(client);

    const result = await handler({ document_id: "tmpl-1" });
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("456");
  });

  it("returns error when upstream returns an error", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "POST",
        path: "/api/v2/documents/newfromtemplate/not-a-template",
        response: { error: "not a template" },
        status: 409,
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = createFromTemplateHandler(client);

    const result = await handler({ document_id: "not-a-template" });
    expect(result.isError).toBe(true);
  });
});
