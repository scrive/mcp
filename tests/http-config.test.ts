import { describe, expect, it } from "vitest";

import { readHttpConfig } from "../src/commands/http.js";

describe("readHttpConfig", () => {
  it("parses the required environment variables", () => {
    const config = readHttpConfig({
      PORT: "8080",
      AUTH_SERVER_URL: "https://oauth2.scrive.com",
      SCRIVE_BASE_URL: "https://scrive.com",
      RESOURCE_URL: "https://example.com/mcp",
      SCOPES: "full",
      ALLOWED_CORS_ORIGINS: "https://chat.example.com, https://claude.example.com",
    });

    expect(config.port).toBe(8080);
    expect(config.scopes).toEqual(["full"]);
    expect(config.corsOrigins).toEqual(["https://chat.example.com", "https://claude.example.com"]);
    expect(config.disableDnsRebindingProtection).toBe(false);
  });

  it("recognizes the dns rebinding override", () => {
    const config = readHttpConfig({
      PORT: "8080",
      AUTH_SERVER_URL: "https://oauth2.scrive.com",
      SCRIVE_BASE_URL: "https://scrive.com",
      RESOURCE_URL: "https://example.com/mcp",
      SCOPES: "full",
      ALLOWED_CORS_ORIGINS: "*",
      DISABLE_DNS_REBINDING_PROTECTION: "true",
    });

    expect(config.disableDnsRebindingProtection).toBe(true);
  });

  it("throws on invalid port values", () => {
    const base = {
      AUTH_SERVER_URL: "https://oauth2.scrive.com",
      SCRIVE_BASE_URL: "https://scrive.com",
      RESOURCE_URL: "https://example.com/mcp",
      SCOPES: "full",
      ALLOWED_CORS_ORIGINS: "*",
    };

    expect(() => readHttpConfig({ ...base, PORT: "abc" })).toThrow("invalid port");
    expect(() => readHttpConfig({ ...base, PORT: "-1" })).toThrow("invalid port");
    expect(() => readHttpConfig({ ...base, PORT: "99999" })).toThrow("invalid port");
    expect(() => readHttpConfig({ ...base, PORT: "0" })).toThrow("invalid port");
    expect(() => readHttpConfig({ ...base, PORT: "3.14" })).toThrow("invalid port");
  });

  it("throws when required variables are missing", () => {
    expect(() =>
      readHttpConfig({
        PORT: "8080",
      }),
    ).toThrow("missing required environment variable");
  });
});
