import { spawn } from "node:child_process";
import http from "node:http";
import { stdin as input, stderr as output } from "node:process";
import readline from "node:readline/promises";

import { writeConfig } from "../config.js";

interface OAuthCredentials {
  server: string;
  clientId: string;
  clientSecret: string;
}

interface TemporaryCredentials {
  token: string;
  tokenSecret: string;
}

interface CallbackResult {
  token: string;
  verifier: string;
}

interface TokenCredentials {
  accessToken: string;
  accessSecret: string;
}

async function promptCredentials(): Promise<OAuthCredentials> {
  const rl = readline.createInterface({ input, output });

  try {
    const server = (await rl.question("Server (e.g. scrive.com): ")).trim();
    if (!server) {
      throw new Error("server is required");
    }

    const clientId = (await rl.question("Client ID: ")).trim();
    if (!clientId) {
      throw new Error("client id is required");
    }

    const clientSecret = (await rl.question("Client secret: ")).trim();
    if (!clientSecret) {
      throw new Error("client secret is required");
    }

    return { server, clientId, clientSecret };
  } finally {
    rl.close();
  }
}

function oauthHeader(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
    .join(", ");
}

function humanizeNetworkError(error: unknown, server: string): Error {
  const cause = (error as { cause?: { code?: string } }).cause;
  const code = cause?.code;

  if (code === "ENOTFOUND") {
    return new Error(`could not reach "${server}" — check the server address and try again`);
  }
  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") {
    return new Error(`could not connect to "${server}" — check the server address and try again`);
  }
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return new Error(`request to "${server}" timed out — please try again`);
  }

  return error instanceof Error ? error : new Error(String(error));
}

async function requestTemporaryCredentials(
  env: OAuthCredentials,
  callbackUrl: string,
  fetchImpl: typeof fetch,
): Promise<TemporaryCredentials> {
  const url = `https://${env.server}/oauth/temporarycredentials?privileges=FULL_ACCESS`;
  const authorization = oauthHeader({
    oauth_signature_method: "PLAINTEXT",
    oauth_consumer_key: env.clientId,
    oauth_signature: `${env.clientSecret}&aaaaaa`,
    oauth_callback: callbackUrl,
  });

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { authorization },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw humanizeNetworkError(error, env.server);
  }

  if (!response.ok) {
    throw new Error(
      `authentication failed (HTTP ${response.status}) — check your server address, Client ID, and Client Secret`,
    );
  }

  const body = new URLSearchParams(await response.text());
  const token = body.get("oauth_token");
  const tokenSecret = body.get("oauth_token_secret");

  if (!token || !tokenSecret) {
    throw new Error("temporary credentials response missing oauth_token or oauth_token_secret");
  }

  return { token, tokenSecret };
}

function waitForCallback(server: http.Server, signal: AbortSignal): Promise<CallbackResult> {
  return new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => {
      reject(new Error("timed out waiting for authorization callback"));
    });

    server.on("request", (request, response) => {
      const url = new URL(request.url ?? "/", `http://localhost`);
      if (url.pathname !== "/callback") {
        response.writeHead(404);
        response.end();
        return;
      }

      const token = url.searchParams.get("oauth_token");
      const verifier = url.searchParams.get("oauth_verifier");

      if (!token || !verifier) {
        response.writeHead(400, { "content-type": "text/html" });
        response.end("<html><body><p>Authorization was denied.</p></body></html>");
        reject(new Error("authorization was denied by the user"));
        return;
      }

      response.writeHead(200, { "content-type": "text/html" });
      response.end(
        "<html><body><p>Authorization successful. You can close this tab.</p></body></html>",
      );
      resolve({ token, verifier });
    });
  });
}

async function exchangeTokenCredentials(
  env: OAuthCredentials,
  temporaryToken: string,
  temporaryTokenSecret: string,
  verifier: string,
  fetchImpl: typeof fetch,
): Promise<TokenCredentials> {
  const url = `https://${env.server}/oauth/tokencredentials`;
  const authorization = oauthHeader({
    oauth_signature_method: "PLAINTEXT",
    oauth_consumer_key: env.clientId,
    oauth_token: temporaryToken,
    oauth_verifier: verifier,
    oauth_signature: `${env.clientSecret}&${temporaryTokenSecret}`,
  });

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { authorization },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw humanizeNetworkError(error, env.server);
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("token exchange failed — the authorization may have expired, try again");
  }

  if (!response.ok) {
    throw new Error(`failed to exchange token credentials (HTTP ${response.status})`);
  }

  const body = new URLSearchParams(await response.text());
  const accessToken = body.get("oauth_token");
  const accessSecret = body.get("oauth_token_secret");

  if (!accessToken || !accessSecret) {
    throw new Error("token credentials response missing oauth_token or oauth_token_secret");
  }

  return { accessToken, accessSecret };
}

function listenOnRandomPort(server: http.Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("failed to bind callback server"));
        return;
      }
      resolve(address.port);
    });
  });
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });
}

function openBrowserCommand(): { command: string; args: (url: string) => string[] } {
  switch (process.platform) {
    case "darwin":
      return { command: "open", args: (url) => [url] };
    case "win32":
      return { command: "cmd", args: (url) => ["/c", "start", "", url] };
    default:
      return { command: "xdg-open", args: (url) => [url] };
  }
}

function openUrl(url: string): void {
  const browser = openBrowserCommand();
  spawn(browser.command, browser.args(url), { stdio: "ignore", detached: true }).unref();
}

export async function runAuth(
  credentials?: OAuthCredentials,
  fetchImpl: typeof fetch = fetch,
  openImpl: (url: string) => void = openUrl,
): Promise<void> {
  const { server, clientId, clientSecret } = credentials ?? (await promptCredentials());

  const callbackServer = http.createServer();
  const port = await listenOnRandomPort(callbackServer);
  const callbackUrl = `http://localhost:${port}/callback`;

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 300_000);

  try {
    const callbackPromise = waitForCallback(callbackServer, abortController.signal);

    const temporaryCredentials = await requestTemporaryCredentials(
      { server, clientId, clientSecret },
      callbackUrl,
      fetchImpl,
    );

    const authorizationUrl = `https://${server}/oauth/authorization?oauth_token=${encodeURIComponent(temporaryCredentials.token)}`;
    openImpl(authorizationUrl);
    output.write("Waiting for authorization in browser...\n");

    const callbackResult = await callbackPromise;

    const tokenCredentials = await exchangeTokenCredentials(
      { server, clientId, clientSecret },
      callbackResult.token,
      temporaryCredentials.tokenSecret,
      callbackResult.verifier,
      fetchImpl,
    );

    await writeConfig({
      server,
      auth: {
        apitoken: clientId,
        apisecret: clientSecret,
        accesstoken: tokenCredentials.accessToken,
        accesssecret: tokenCredentials.accessSecret,
      },
    });

    output.write("Authorization successful. Config saved.\n");
  } finally {
    clearTimeout(timeout);
    await closeServer(callbackServer);
  }
}
