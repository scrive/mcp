import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { authHeader, type Config, loadConfigFrom } from "../src/config.js";

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

describe("config", () => {
  it("loads a valid config file", async () => {
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

  it("formats the oauth header", () => {
    expect(authHeader(validConfig())).toBe(
      'oauth_signature_method="PLAINTEXT", oauth_consumer_key="token", oauth_token="atoken", oauth_signature="secret&asecret"',
    );
  });
});
