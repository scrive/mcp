import { describe, expect, it } from "vitest";

import { DocumentClient } from "../src/scrive/document/client.js";
import { getUsageStatsHandler } from "../src/tools/get-usage-stats.js";
import { fakeFetch } from "./helpers/fake-fetch.js";

const sampleStats = {
  user: {
    documents_sent: 5,
    documents_closed: 3,
    signatures: 8,
  },
};

describe("getUsageStatsHandler", () => {
  it("returns daily usage stats", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/usagestats/days",
        response: sampleStats,
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = getUsageStatsHandler(client);

    const result = await handler({ period: "days" });
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.user.documents_sent).toBe(5);
  });

  it("returns monthly usage stats", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/usagestats/months",
        response: sampleStats,
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = getUsageStatsHandler(client);

    const result = await handler({ period: "months" });
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.user.documents_closed).toBe(3);
  });

  it("passes query parameters", async () => {
    const { fetchImpl, requests } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/usagestats/days",
        response: sampleStats,
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = getUsageStatsHandler(client);

    await handler({
      period: "days",
      withCompany: true,
      recursive: true,
      userGroupID: "9160765006610908070",
      includeZeroRecords: true,
      fromDate: "2026-01-01",
      toDate: "2026-01-31",
    });

    const url = requests[0].url;
    expect(url.searchParams.get("withCompany")).toBe("true");
    expect(url.searchParams.get("recursive")).toBe("true");
    expect(url.searchParams.get("userGroupID")).toBe("9160765006610908070");
    expect(url.searchParams.get("includeZeroRecords")).toBe("true");
    expect(url.searchParams.get("fromDate")).toBe("2026-01-01");
    expect(url.searchParams.get("toDate")).toBe("2026-01-31");
  });

  it("handles errors gracefully", async () => {
    const { fetchImpl } = fakeFetch([
      {
        method: "GET",
        path: "/api/v2/usagestats/days",
        status: 403,
        response: { error: "forbidden" },
      },
    ]);
    const client = new DocumentClient({
      baseUrl: "http://test",
      authHeader: "test-auth",
      fetchImpl,
    });
    const handler = getUsageStatsHandler(client);

    const result = await handler({ period: "days" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("403");
  });
});
