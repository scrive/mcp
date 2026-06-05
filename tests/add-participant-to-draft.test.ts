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

  it("sets authentication providers and identity fields on the new participant", async () => {
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
      { method: "PATCH", path: "/journey/external/drafts/draft-1", response: {} },
    ]);
    const client = new JourneyClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    await addParticipantToDraftHandler(client)({
      draft_id: "draft-1",
      name: "Alice Smith",
      email: "alice@test.com",
      authentication_to_sign: "se_bank_id",
      authentication_to_view: "sms_otp",
      authentication_to_view_archived: "ftn",
      personal_number: "199001011234",
      mobile_number: "+46700000000",
    });

    const participant = JSON.parse(requests[1].body as string).participants[0];
    expect(participant.authentications.auth_to_sign.provider).toBe("se_bank_id");
    expect(participant.authentications.auth_to_view.provider).toBe("sms_otp");
    expect(participant.authentications.auth_to_view_archived.provider).toBe("ftn");
    const personalNumber = participant.fields.find(
      (f: { type: string }) => f.type === "personal_number",
    );
    const mobile = participant.fields.find((f: { type: string }) => f.type === "mobile");
    expect(personalNumber.value).toBe("199001011234");
    expect(mobile.value).toBe("+46700000000");
  });

  it("omits authentications when no providers are given", async () => {
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
      { method: "PATCH", path: "/journey/external/drafts/draft-1", response: {} },
    ]);
    const client = new JourneyClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    await addParticipantToDraftHandler(client)({
      draft_id: "draft-1",
      name: "Alice",
      email: "alice@test.com",
    });

    const participant = JSON.parse(requests[1].body as string).participants[0];
    expect(participant.authentications).toBeUndefined();
  });

  it("preserves an existing participant's authentications when adding another", async () => {
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
              authentications: { auth_to_sign: { provider: "se_bank_id" } },
            },
          ],
          steps: [
            { actions: [{ kind: "sign", participant_id: "existing-1", document_id: "doc-1" }] },
          ],
          documents: [{ id: "doc-1", kind: "pdf", name: "contract" }],
        },
      },
      { method: "PATCH", path: "/journey/external/drafts/draft-1", response: {} },
    ]);
    const client = new JourneyClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });

    await addParticipantToDraftHandler(client)({
      draft_id: "draft-1",
      name: "Bob",
      email: "bob@test.com",
    });

    const participants = JSON.parse(requests[1].body as string).participants;
    expect(participants).toHaveLength(2);
    const existing = participants.find(
      (p: { association_id: string }) => p.association_id === "existing-1",
    );
    expect(existing.authentications.auth_to_sign.provider).toBe("se_bank_id");
  });
});
