import { readFile, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runAuth } from "../src/commands/auth.js";
import { configPath } from "../src/config.js";

const testCredentials = {
  server: "scrive.example.com",
  email: "user@example.com",
  password: "hunter2",
};

const personalTokenResponse = {
  apitoken: "test-api-token",
  apisecret: "test-api-secret",
  accesstoken: "test-access-token",
  accesssecret: "test-access-secret",
};

interface FetchCall {
  url: string;
  method: string;
  body: string;
}

function createTokenMock(options: { status?: number; body?: unknown } = {}): {
  fetchImpl: typeof fetch;
  fetchCalls: FetchCall[];
} {
  const fetchCalls: FetchCall[] = [];

  const fetchImpl = (async (input: string, init?: RequestInit) => {
    fetchCalls.push({
      url: input,
      method: init?.method ?? "GET",
      body: init?.body?.toString() ?? "",
    });

    const status = options.status ?? 200;
    const responseBody = options.body !== undefined ? options.body : personalTokenResponse;

    return new Response(JSON.stringify(responseBody), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  return { fetchImpl, fetchCalls };
}

describe("runAuth", () => {
  let savedHome: string | undefined;

  beforeEach(async () => {
    savedHome = process.env.HOME;
    const tempHome = await mkdtemp(path.join(os.tmpdir(), "scrive-mcp-test-"));
    process.env.HOME = tempHome;
  });

  afterEach(() => {
    if (savedHome !== undefined) {
      process.env.HOME = savedHome;
    }
  });

  it("exchanges email and password for personal access credentials", async () => {
    const { fetchImpl, fetchCalls } = createTokenMock();

    await runAuth(testCredentials, fetchImpl);

    expect(fetchCalls).toHaveLength(1);

    const call = fetchCalls[0];
    expect(call.url).toBe("https://scrive.example.com/api/v2/getpersonaltoken");
    expect(call.method).toBe("POST");

    const params = new URLSearchParams(call.body);
    expect(params.get("email")).toBe("user@example.com");
    expect(params.get("password")).toBe("hunter2");

    const raw = await readFile(configPath(), "utf8");
    const config = JSON.parse(raw);

    expect(config).toEqual({
      server: "scrive.example.com",
      auth: personalTokenResponse,
    });
  });

  it("reports invalid credentials on 401", async () => {
    const { fetchImpl } = createTokenMock({ status: 401 });

    await expect(runAuth(testCredentials, fetchImpl)).rejects.toThrow(
      "authentication failed — check your email and password",
    );
  });

  it("reports the HTTP status on other failures", async () => {
    const { fetchImpl } = createTokenMock({ status: 500 });

    await expect(runAuth(testCredentials, fetchImpl)).rejects.toThrow(
      "failed to get personal access credentials (HTTP 500)",
    );
  });

  it("rejects a response missing credential fields", async () => {
    const { fetchImpl } = createTokenMock({ body: { apitoken: "only-this" } });

    await expect(runAuth(testCredentials, fetchImpl)).rejects.toThrow(
      "personal access credentials response missing fields",
    );
  });

  it("reports unreachable server on DNS failure", async () => {
    const fetchImpl = (() => {
      const error = new TypeError("fetch failed");
      (error as unknown as { cause: { code: string } }).cause = { code: "ENOTFOUND" };
      return Promise.reject(error);
    }) as typeof fetch;

    await expect(runAuth(testCredentials, fetchImpl)).rejects.toThrow(
      'could not reach "scrive.example.com"',
    );
  });

  it("reports connection failure on refused/timeout", async () => {
    const fetchImpl = (() => {
      const error = new TypeError("fetch failed");
      (error as unknown as { cause: { code: string } }).cause = { code: "ECONNREFUSED" };
      return Promise.reject(error);
    }) as typeof fetch;

    await expect(runAuth(testCredentials, fetchImpl)).rejects.toThrow(
      'could not connect to "scrive.example.com"',
    );
  });
});
