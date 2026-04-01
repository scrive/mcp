import { describe, expect, it } from "vitest";

import { JourneyClient } from "../src/scrive/journey/client.js";
import { listFlowDraftsHandler } from "../src/tools/list-flow-drafts.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("listFlowDraftsHandler", () => {
  it("passes default limit of 20", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/journey/external/drafts",
        response: { navigation: {}, results: [] },
      },
    ]);
    const client = new JourneyClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = listFlowDraftsHandler(client);

    await handler({});
    expect(requests[0].url.searchParams.get("limit")).toBe("20");
  });
});
