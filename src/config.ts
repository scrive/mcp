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

const KEYCHAIN_SERVICE = "scrive-mcp";
const KEYCHAIN_ACCOUNT = "credentials";

export function resolveConfigPath(
  platform: NodeJS.Platform,
  homeDir: string,
  env: NodeJS.ProcessEnv,
): string {
  if (platform === "win32") {
    const base = env.APPDATA && env.APPDATA.length > 0 ? env.APPDATA : homeDir;
    return path.join(base, "scrive-mcp", "config.json");
  }

  if (platform === "darwin") {
    return path.join(homeDir, "Library", "Application Support", "scrive-mcp", "config.json");
  }

  const xdg = env.XDG_CONFIG_HOME && env.XDG_CONFIG_HOME.length > 0 ? env.XDG_CONFIG_HOME : null;
  const base = xdg ?? path.join(homeDir, ".config");
  return path.join(base, "scrive-mcp", "config.json");
}

export function configPath(): string {
  return resolveConfigPath(process.platform, os.homedir(), process.env);
}

function insecureStorageEnabled(): boolean {
  return process.env.SCRIVE_MCP_INSECURE_STORAGE === "true";
}

export async function writeConfig(config: Config): Promise<{ insecureStorageUsed: boolean }> {
  if (insecureStorageEnabled()) {
    await writeConfigFile(config, configPath());
    return { insecureStorageUsed: true };
  }

  try {
    await writeToKeychain(config);
  } catch (error) {
    throw new Error(
      `could not store credentials in the OS keychain: ${String(error)}. ` +
        "Unlock your keychain and try again.",
    );
  }
  return { insecureStorageUsed: false };
}

async function writeToKeychain(config: Config): Promise<void> {
  const { Entry } = await import("@napi-rs/keyring");
  const entry = new Entry(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
  entry.setPassword(JSON.stringify(config));
}

export async function loadConfig(): Promise<Config> {
  if (insecureStorageEnabled()) {
    return loadConfigFrom(configPath());
  }

  let raw: string | null;
  try {
    raw = await readFromKeychain();
  } catch (error) {
    throw new Error(
      `could not read credentials from the OS keychain: ${String(error)}. ` +
        "Unlock your keychain and try again, or set SCRIVE_MCP_INSECURE_STORAGE=true if " +
        "you stored credentials in a plaintext config file instead.",
    );
  }
  if (!raw) {
    throw new Error("config not found, run `scrive-mcp auth` first");
  }
  return parseConfig(raw);
}

async function readFromKeychain(): Promise<string | null> {
  const { Entry } = await import("@napi-rs/keyring");
  const entry = new Entry(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
  return entry.getPassword();
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
  return parseConfig(raw);
}

function parseConfig(raw: string): Config {
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

async function writeConfigFile(config: Config, filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  await writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

export function authHeader(config: Config): string {
  return `oauth_signature_method="PLAINTEXT", oauth_consumer_key="${config.auth.apitoken}", oauth_token="${config.auth.accesstoken}", oauth_signature="${config.auth.apisecret}&${config.auth.accesssecret}"`;
}
