import { stdin as input, stderr as output } from "node:process";
import readline from "node:readline/promises";

import type { AuthCredentials } from "../config.js";
import { writeConfig } from "../config.js";

interface LoginData {
  server: string;
  email: string;
  password: string;
}

function promptPassword(query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    output.write(query);

    const characters: string[] = [];
    const wasRaw = input.isRaw;

    const cleanup = (): void => {
      input.removeListener("data", onData);
      if (input.isTTY) {
        input.setRawMode(wasRaw);
      }
      input.pause();
    };

    const onData = (chunk: string): void => {
      for (const character of chunk) {
        switch (character) {
          case "\n":
          case "\r":
          case "\u0004": // Ctrl-D
            output.write("\n");
            cleanup();
            resolve(characters.join(""));
            return;
          case "\u0003": // Ctrl-C
            output.write("\n");
            cleanup();
            reject(new Error("cancelled"));
            return;
          case "\u007f": // Backspace / Delete
          case "\b":
            if (characters.length > 0) {
              characters.pop();
              output.write("\b \b");
            }
            break;
          default:
            // Ignore control characters (escape sequences, arrow keys, etc.).
            if (character >= " ") {
              characters.push(character);
              output.write("*");
            }
        }
      }
    };

    if (input.isTTY) {
      input.setRawMode(true);
    }
    input.resume();
    input.setEncoding("utf8");
    input.on("data", onData);
  });
}

async function promptCredentials(): Promise<LoginData> {
  const rl = readline.createInterface({ input, output });

  let server: string;
  let email: string;
  try {
    server = (await rl.question("Server (e.g. scrive.com): ")).trim();
    if (!server) {
      throw new Error("server is required");
    }

    email = (await rl.question("Email: ")).trim();
    if (!email) {
      throw new Error("email is required");
    }
  } finally {
    rl.close();
  }

  const password = await promptPassword("Password: ");
  if (!password) {
    throw new Error("password is required");
  }

  return { server, email, password };
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

async function fetchLoginData(
  credentials: LoginData,
  fetchImpl: typeof fetch,
): Promise<AuthCredentials> {
  const url = `https://${credentials.server}/api/v2/getpersonaltoken`;
  const body = new URLSearchParams({
    email: credentials.email,
    password: credentials.password,
  });

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw humanizeNetworkError(error, credentials.server);
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("authentication failed — check your email and password");
  }

  if (!response.ok) {
    throw new Error(`failed to get personal access credentials (HTTP ${response.status})`);
  }

  let data: Partial<AuthCredentials>;
  try {
    data = (await response.json()) as Partial<AuthCredentials>;
  } catch {
    throw new Error("personal access credentials response was not valid JSON");
  }

  if (!data.apitoken || !data.apisecret || !data.accesstoken || !data.accesssecret) {
    throw new Error("personal access credentials response missing fields");
  }

  return {
    apitoken: data.apitoken,
    apisecret: data.apisecret,
    accesstoken: data.accesstoken,
    accesssecret: data.accesssecret,
  };
}

export async function runAuth(
  credentials?: LoginData,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const resolved = credentials ?? (await promptCredentials());
  const auth = await fetchLoginData(resolved, fetchImpl);

  await writeConfig({ server: resolved.server, auth });

  output.write("Authorization successful. Config saved.\n");
}
