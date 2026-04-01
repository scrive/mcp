import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { listDocumentsHandler } from "../src/tools/list-documents.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("listDocumentsHandler", () => {
  it("passes default offset and max", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/list",
        response: { total_matching: 0, documents: [] },
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = listDocumentsHandler(client);

    await handler({});
    expect(requests[0].url.searchParams.get("offset")).toBe("0");
    expect(requests[0].url.searchParams.get("max")).toBe("20");
  });

  it("serializes filters into the params", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/list",
        response: { total_matching: 0, documents: [] },
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = listDocumentsHandler(client);

    await handler({ status: ["pending"] });
    const filter = requests[0].url.searchParams.get("filter");
    expect(filter).toBeDefined();
    expect(filter).toContain("pending");
  });

  it("formats response with document summaries", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/list",
        response: {
          total_matching: 1,
          documents: [
            {
              id: "doc-1",
              title: "Test",
              status: "pending",
              mtime: "2025-01-01",
              extra_field: true,
            },
          ],
        },
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = listDocumentsHandler(client);

    const result = await handler({});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.total_matching).toBe(1);
    expect(parsed.documents[0].id).toBe("doc-1");
    expect(parsed.documents[0].extra_field).toBeUndefined();
  });
});
