import { describe, expect, it } from "vitest";

import { JourneyClient } from "../src/scrive/journey/client.js";
import { addParticipantToDraftHandler } from "../src/tools/add-participant-to-draft.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

describe("addParticipantToDraftHandler", () => {
  it("adds participant and generates steps", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/journey/external/drafts/draft-1",
        response: {
          id: "draft-1",
          participants: [],
          steps: [],
          documents: [{ id: "doc-1", kind: "pdf", name: "contract" }],
        },
      },
      {
        method: "PATCH",
        path: "/journey/external/drafts/draft-1",
        response: {},
      },
    ]);
    const client = new JourneyClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = addParticipantToDraftHandler(client);

    const result = await handler({
      draft_id: "draft-1",
      name: "Alice Smith",
      email: "alice@test.com",
      action: "approve",
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("Alice Smith");
    expect(result.content[0].text).toContain("approve");

    const patchBody = JSON.parse(requests[1].body as string);
    expect(patchBody.participants).toHaveLength(1);
    expect(patchBody.participants[0]._action).toBeUndefined();
  });

  it("preserves existing participants and their actions", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/journey/external/drafts/draft-1",
        response: {
          id: "draft-1",
          participants: [
            {
              association_id: "existing-1",
              invitation_method: "email",
              confirmation_method: "email",
              fields: [],
            },
          ],
          steps: [
            {
              actions: [{ kind: "approve", participant_id: "existing-1", document_id: "doc-1" }],
            },
          ],
          documents: [{ id: "doc-1", kind: "pdf", name: "contract" }],
        },
      },
      {
        method: "PATCH",
        path: "/journey/external/drafts/draft-1",
        response: {},
      },
    ]);
    const client = new JourneyClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = addParticipantToDraftHandler(client);

    await handler({
      draft_id: "draft-1",
      name: "Bob",
      email: "bob@test.com",
    });

    const patchBody = JSON.parse(requests[1].body as string);
    expect(patchBody.participants).toHaveLength(2);
  });
});
