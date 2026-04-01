import { describe, expect, it } from "vitest";

import { JourneyClient } from "../src/scrive/journey/client.js";
import { startFlowHandler } from "../src/tools/start-flow.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("startFlowHandler", () => {
  it("returns the flow ID on success", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "POST",
        path: "/journey/external/drafts/draft-1/start",
        response: { flow_id: "flow-abc" },
      },
    ]);
    const client = new JourneyClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = startFlowHandler(client);

    const result = await handler({ draft_id: "draft-1" });
    expect(result.content[0].text).toContain("flow-abc");
  });
});
