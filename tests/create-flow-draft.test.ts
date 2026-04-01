import { describe, expect, it } from "vitest";

import { JourneyClient } from "../src/scrive/journey/client.js";
import { createFlowDraftHandler } from "../src/tools/create-flow-draft.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("createFlowDraftHandler", () => {
  it("returns the new draft ID on success", async () => {
    const { fetchImpl } = fakeFetch([
      { method: "POST", path: "/journey/external/drafts", response: { id: "draft-uuid-123" } },
    ]);
    const client = new JourneyClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = createFlowDraftHandler(client);

    const result = await handler({ process_title: "Test Flow" });
    expect(result.content[0].text).toContain("draft-uuid-123");
  });

  it("rejects empty process_title", async () => {
    const { fetchImpl } = fakeFetch([]);
    const client = new JourneyClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = createFlowDraftHandler(client);

    const result = await handler({ process_title: "" });
    expect(result.isError).toBe(true);
  });
});
