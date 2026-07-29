import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  authHeader,
  type Config,
  configPath,
  loadConfig,
  loadConfigFrom,
  resolveConfigPath,
  writeConfig,
} from "../src/config.js";

// In-memory stand-in for the OS keychain. `available` toggles whether the
// native entry can be constructed; `stored` holds the single credential blob.
const keychain = vi.hoisted(() => ({ available: true, stored: null as string | null }));

vi.mock("@napi-rs/keyring", () => ({
  Entry: class {
    constructor() {
      if (!keychain.available) {
        throw new Error("Platform failure: A default keychain could not be found.");
      }
    }
    getPassword(): string | null {
      return keychain.stored;
    }
    setPassword(value: string): void {
      keychain.stored = value;
    }
  },
}));

function validConfig(): Config {
  return {
    server: "scrive.com",
    auth: {
      apitoken: "token",
      apisecret: "secret",
      accesstoken: "atoken",
      accesssecret: "asecret",
    },
  };
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2));
}

async function tempFile(name: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scrive-mcp-"));
  return path.join(dir, name);
}

describe("loadConfigFrom", () => {
  it("reads a valid config file", async () => {
    const filePath = await tempFile("config.json");
    const config = validConfig();
    await writeFile(filePath, JSON.stringify(config, null, 2));

    await expect(loadConfigFrom(filePath)).resolves.toEqual(config);
  });

  it("reports missing config files", async () => {
    const filePath = await tempFile("does-not-exist.json");
    await expect(loadConfigFrom(filePath)).rejects.toThrow("config not found");
  });

  it("reports invalid config json", async () => {
    const filePath = await tempFile("invalid-config.json");
    await writeFile(filePath, "{bad json");

    await expect(loadConfigFrom(filePath)).rejects.toThrow("invalid config JSON");
  });

  it("requires a server value", async () => {
    const filePath = await tempFile("missing-server.json");
    const config = validConfig();
    config.server = "";
    await writeJson(filePath, config);

    await expect(loadConfigFrom(filePath)).rejects.toThrow("missing server");
  });

  it("requires all auth fields", async () => {
    const filePath = await tempFile("missing-auth.json");
    const config = validConfig();
    config.auth.apitoken = "";
    await writeJson(filePath, config);

    await expect(loadConfigFrom(filePath)).rejects.toThrow("missing auth credentials");
  });
});

describe("resolveConfigPath", () => {
  it("uses %APPDATA% on windows when set", () => {
    expect(
      resolveConfigPath("win32", "C:\\Users\\test", {
        APPDATA: "C:\\Users\\test\\AppData\\Roaming",
      }),
    ).toBe(path.join("C:\\Users\\test\\AppData\\Roaming", "scrive-mcp", "config.json"));
  });

  it("falls back to home dir on windows when APPDATA is unset", () => {
    expect(resolveConfigPath("win32", "C:\\Users\\test", {})).toBe(
      path.join("C:\\Users\\test", "scrive-mcp", "config.json"),
    );
  });

  it("uses Library/Application Support on macos", () => {
    expect(resolveConfigPath("darwin", "/Users/test", {})).toBe(
      path.join("/Users/test", "Library", "Application Support", "scrive-mcp", "config.json"),
    );
  });

  it("respects XDG_CONFIG_HOME on linux", () => {
    expect(resolveConfigPath("linux", "/home/test", { XDG_CONFIG_HOME: "/home/test/custom" })).toBe(
      path.join("/home/test/custom", "scrive-mcp", "config.json"),
    );
  });

  it("falls back to ~/.config on linux when XDG_CONFIG_HOME is unset", () => {
    expect(resolveConfigPath("linux", "/home/test", {})).toBe(
      path.join("/home/test", ".config", "scrive-mcp", "config.json"),
    );
  });
});

describe("keychain config storage", () => {
  beforeEach(async () => {
    vi.stubEnv("HOME", await mkdtemp(path.join(os.tmpdir(), "scrive-mcp-kc-")));
    vi.stubEnv("SCRIVE_MCP_INSECURE_STORAGE", undefined);
    keychain.available = true;
    keychain.stored = null;
  });

  it("stores credentials in the keychain", async () => {
    const result = await writeConfig(validConfig());

    expect(result).toEqual({ insecureStorageUsed: false });
    expect(keychain.stored).toBe(JSON.stringify(validConfig()));
  });

  it("fails loudly when the keychain is unavailable on write", async () => {
    keychain.available = false;

    await expect(writeConfig(validConfig())).rejects.toThrow(
      "could not store credentials in the OS keychain",
    );
  });

  it("reads credentials from the keychain", async () => {
    keychain.stored = JSON.stringify(validConfig());

    await expect(loadConfig()).resolves.toEqual(validConfig());
  });

  it("reports not-found when the keychain has no entry", async () => {
    await expect(loadConfig()).rejects.toThrow("config not found");
  });

  it("fails loudly when the keychain is unavailable on read", async () => {
    keychain.available = false;

    await expect(loadConfig()).rejects.toThrow("could not read credentials from the OS keychain");
  });
});

describe("insecure config storage", () => {
  beforeEach(async () => {
    vi.stubEnv("HOME", await mkdtemp(path.join(os.tmpdir(), "scrive-mcp-cfg-")));
    vi.stubEnv("SCRIVE_MCP_INSECURE_STORAGE", "true");
  });

  it("writes credentials to a plaintext file and reports the insecure path", async () => {
    const result = await writeConfig(validConfig());

    expect(result).toEqual({ insecureStorageUsed: true });
    const raw = await readFile(configPath(), "utf8");
    expect(JSON.parse(raw)).toEqual(validConfig());
  });

  it("loads credentials written in insecure mode", async () => {
    await writeConfig(validConfig());

    await expect(loadConfig()).resolves.toEqual(validConfig());
  });
});

describe("authHeader", () => {
  it("formats the oauth header", () => {
    expect(authHeader(validConfig())).toBe(
      'oauth_signature_method="PLAINTEXT", oauth_consumer_key="token", oauth_token="atoken", oauth_signature="secret&asecret"',
    );
  });
});
