import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface AuthCredentials {
  apitoken: string;
  apisecret: string;
  accesstoken: string;
  accesssecret: string;
}

export interface Config {
  server: string;
  auth: AuthCredentials;
}

export function configPath(): string {
  return path.join(os.homedir(), ".config", "scrive-mcp", "config.json");
}

export async function writeConfig(config: Config): Promise<void> {
  const filePath = configPath();
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  await writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

export async function loadConfig(): Promise<Config> {
  return loadConfigFrom(configPath());
}

export async function loadConfigFrom(filePath: string): Promise<Config> {
  let raw: string;

  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("config not found, run `scrive-mcp auth` first");
    }

    throw new Error(`reading config: ${String(error)}`);
  }

  let parsed: Config;
  try {
    parsed = JSON.parse(raw) as Config;
  } catch (error) {
    throw new Error(`invalid config JSON: ${String(error)}`);
  }

  if (!parsed.server) {
    throw new Error("config missing server, run `scrive-mcp auth` first");
  }

  const auth = parsed.auth;
  if (!auth?.apitoken || !auth.apisecret || !auth.accesstoken || !auth.accesssecret) {
    throw new Error("config missing auth credentials, run `scrive-mcp auth` first");
  }

  return parsed;
}

export function authHeader(config: Config): string {
  return `oauth_signature_method="PLAINTEXT", oauth_consumer_key="${config.auth.apitoken}", oauth_token="${config.auth.accesstoken}", oauth_signature="${config.auth.apisecret}&${config.auth.accesssecret}"`;
}
