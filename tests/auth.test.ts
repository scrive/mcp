import { readFile, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { runAuth } from "../src/commands/auth.js";
import { configPath } from "../src/config.js";

// Prevent tests from accessing the real keychain
vi.mock("@napi-rs/keyring", () => ({
  Entry: class {
    constructor() {
      throw new Error("keychain disabled in tests");
    }
  },
}));

const testCredentials = {
  server: "scrive.example.com",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
};

function parseOAuthHeader(header: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const part of header.split(",")) {
    const match = part.trim().match(/^(\w+)="(.*)"$/);
    if (match) {
      params[match[1]] = decodeURIComponent(match[2]);
    }
  }
  return params;
}

/**
 * Creates a mock fetch that handles the two OAuth endpoints and a mock open
 * that simulates the browser redirect to the callback server.
 *
 * The callback URL is captured from the temporary credentials request's
 * Authorization header, then used by the open mock to trigger the callback.
 */
function createOAuthMocks(
  options: {
    temporaryCredentialsStatus?: number;
    tokenCredentialsStatus?: number;
  } = {},
): {
  fetchImpl: typeof fetch;
  openImpl: (url: string) => void;
  fetchCalls: Array<{ url: string; authorization: string }>;
  openCalls: string[];
} {
  let capturedCallbackUrl = "";
  const fetchCalls: Array<{ url: string; authorization: string }> = [];
  const openCalls: string[] = [];

  const fetchImpl = (async (input: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const authorization = headers.get("authorization") ?? "";
    fetchCalls.push({ url: input, authorization });

    if (input.includes("/oauth/temporarycredentials")) {
      const oauthParams = parseOAuthHeader(authorization);
      capturedCallbackUrl = oauthParams.oauth_callback ?? "";

      return new Response(
        "oauth_token=temp-token&oauth_token_secret=temp-secret&oauth_callback_confirmed=true",
        {
          status: options.temporaryCredentialsStatus ?? 200,
          headers: { "content-type": "application/x-www-form-urlencoded" },
        },
      );
    }

    if (input.includes("/oauth/tokencredentials")) {
      return new Response("oauth_token=final-access-token&oauth_token_secret=final-access-secret", {
        status: options.tokenCredentialsStatus ?? 200,
        headers: { "content-type": "application/x-www-form-urlencoded" },
      });
    }

    throw new Error(`unexpected fetch: ${input}`);
  }) as typeof fetch;

  const openImpl = (url: string): void => {
    openCalls.push(url);

    if (!capturedCallbackUrl) {
      throw new Error("no callback URL captured from temporary credentials request");
    }

    const separator = capturedCallbackUrl.includes("?") ? "&" : "?";
    const callbackUrl = `${capturedCallbackUrl}${separator}oauth_token=temp-token&oauth_verifier=test-verifier`;
    fetch(callbackUrl);
  };

  return { fetchImpl, openImpl, fetchCalls, openCalls };
}

describe("runAuth", () => {
  beforeEach(async () => {
    vi.stubEnv("HOME", await mkdtemp(path.join(os.tmpdir(), "scrive-mcp-test-")));
    vi.stubEnv("SCRIVE_MCP_INSECURE_STORAGE", undefined);
  });

  it("fails early with actionable hint when temporary credentials are rejected", async () => {
    const { fetchImpl, openImpl, openCalls } = createOAuthMocks({
      temporaryCredentialsStatus: 401,
    });

    // Should report the HTTP status and suggest checking credentials
    await expect(runAuth(testCredentials, fetchImpl, openImpl)).rejects.toThrow(
      "authentication failed (HTTP 401) — check your server address, Client ID, and Client Secret",
    );

    // Should not have opened the browser since the failure happened before authorization
    expect(openCalls).toHaveLength(0);
  });

  it("reports expired authorization on token exchange failure", async () => {
    const { fetchImpl, openImpl } = createOAuthMocks({ tokenCredentialsStatus: 401 });

    await expect(runAuth(testCredentials, fetchImpl, openImpl)).rejects.toThrow(
      "authorization may have expired",
    );
  });

  it("reports unreachable server on DNS failure", async () => {
    const fetchImpl = (() => {
      const error = new TypeError("fetch failed");
      (error as unknown as { cause: { code: string } }).cause = { code: "ENOTFOUND" };
      return Promise.reject(error);
    }) as typeof fetch;
    const openImpl = () => {};

    await expect(runAuth(testCredentials, fetchImpl, openImpl)).rejects.toThrow(
      'could not reach "scrive.example.com"',
    );
  });

  it("reports connection failure on refused/timeout", async () => {
    const fetchImpl = (() => {
      const error = new TypeError("fetch failed");
      (error as unknown as { cause: { code: string } }).cause = { code: "ECONNREFUSED" };
      return Promise.reject(error);
    }) as typeof fetch;
    const openImpl = () => {};

    await expect(runAuth(testCredentials, fetchImpl, openImpl)).rejects.toThrow(
      'could not connect to "scrive.example.com"',
    );
  });

  it("aborts when the keychain is unavailable and insecure storage is not enabled", async () => {
    const { fetchImpl, openImpl } = createOAuthMocks();

    await expect(runAuth(testCredentials, fetchImpl, openImpl)).rejects.toThrow(
      "could not store credentials in the OS keychain",
    );
  });

  it("completes the full OAuth flow correctly", async () => {
    vi.stubEnv("SCRIVE_MCP_INSECURE_STORAGE", "true");
    const { fetchImpl, openImpl, fetchCalls, openCalls } = createOAuthMocks();

    await runAuth(testCredentials, fetchImpl, openImpl);

    expect(fetchCalls).toHaveLength(2);

    // Step 1: Request temporary credentials with FULL_ACCESS privileges
    const tempCall = fetchCalls[0];
    expect(tempCall.url).toContain("/oauth/temporarycredentials");
    expect(tempCall.url).toContain("privileges=FULL_ACCESS");

    const tempParams = parseOAuthHeader(tempCall.authorization);
    expect(tempParams.oauth_signature_method).toBe("PLAINTEXT");
    expect(tempParams.oauth_consumer_key).toBe("test-client-id");
    expect(tempParams.oauth_signature).toBe("test-client-secret&aaaaaa");
    expect(tempParams.oauth_callback).toMatch(/^http:\/\/localhost:\d+\/callback$/);

    // Step 2: Open browser for user authorization
    expect(openCalls).toHaveLength(1);
    expect(openCalls[0]).toBe(
      "https://scrive.example.com/oauth/authorization?oauth_token=temp-token",
    );

    // Step 3: Exchange verifier for access token credentials
    const tokenCall = fetchCalls[1];
    expect(tokenCall.url).toContain("/oauth/tokencredentials");

    const tokenParams = parseOAuthHeader(tokenCall.authorization);
    expect(tokenParams.oauth_signature_method).toBe("PLAINTEXT");
    expect(tokenParams.oauth_consumer_key).toBe("test-client-id");
    expect(tokenParams.oauth_token).toBe("temp-token");
    expect(tokenParams.oauth_verifier).toBe("test-verifier");
    expect(tokenParams.oauth_signature).toBe("test-client-secret&temp-secret");

    // Step 4: Save config with all credentials
    const raw = await readFile(configPath(), "utf8");
    const config = JSON.parse(raw);

    expect(config).toEqual({
      server: "scrive.example.com",
      auth: {
        apitoken: "test-client-id",
        apisecret: "test-client-secret",
        accesstoken: "final-access-token",
        accesssecret: "final-access-secret",
      },
    });
  });
});
