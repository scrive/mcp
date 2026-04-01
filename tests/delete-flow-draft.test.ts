import { describe, expect, it } from "vitest";

import { JourneyClient } from "../src/scrive/journey/client.js";
import { deleteFlowDraftHandler } from "../src/tools/delete-flow-draft.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("deleteFlowDraftHandler", () => {
  it("deletes a flow draft", async () => {
    const { fetchImpl } = fakeFetch([
      { method: "DELETE", path: "/journey/external/drafts/draft-1", response: {} },
    ]);
    const client = new JourneyClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = deleteFlowDraftHandler(client);

    const result = await handler({ draft_id: "draft-1" });
    expect(result.isError).toBe(false);
  });
});
