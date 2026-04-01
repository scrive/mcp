import { describe, expect, it } from "vitest";

import { JourneyClient } from "../src/scrive/journey/client.js";
import { getFlowDraftHandler } from "../src/tools/get-flow-draft.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("getFlowDraftHandler", () => {
  it("returns draft JSON", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/journey/external/drafts/draft-1",
        response: { id: "draft-1", process_title: "Test" },
      },
    ]);
    const client = new JourneyClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = getFlowDraftHandler(client);

    const result = await handler({ draft_id: "draft-1" });
    expect(result.content[0].text).toContain("draft-1");
    expect(result.content[0].text).toContain("Test");
  });
});
