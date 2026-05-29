import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { JourneyClient } from "../src/scrive/journey/client.js";
import { RateLimiter } from "../src/scrive/rate-limiter.js";
import { createServer } from "../src/server.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("createServer rate limiting", () => {
  it("allows a call within budget, then rejects without hitting the API", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/documents/list",
        response: { total_matching: 0, documents: [] },
      },
    ]);
    const clientConfig = { baseUrl: "http://test", authHeader: "test-auth", fetchImpl };

    const server = createServer({
      documentClient: new DocumentClient(clientConfig),
      journeyClient: new JourneyClient(clientConfig),
      allowedDirectories: [],
      isRemote: true,
      rateLimiter: new RateLimiter({ callsPerWindow: 1, duration: 60 }),
      rateLimitKey: "test-key",
    });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const first = await client.callTool({ name: "list_documents", arguments: {} });
    const second = await client.callTool({ name: "list_documents", arguments: {} });

    expect(first.isError).toBeFalsy();
    expect(second.isError).toBe(true);
    expect((second.content as { text: string }[])[0].text).toContain("Rate limit exceeded");
    expect(requests).toHaveLength(1);

    await client.close();
  });
});
