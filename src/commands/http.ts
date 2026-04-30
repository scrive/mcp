import { createServer as createHttpServer } from "node:http";

import type { RequestHandler } from "express";
import { metadataHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/metadata.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { DocumentClient } from "../scrive/document/client.js";
import { JourneyClient } from "../scrive/journey/client.js";
import { createServer } from "../server.js";

function internalError(res: {
  headersSent: boolean;
  status: (code: number) => { json: (value: unknown) => void };
}): void {
  if (res.headersSent) {
    return;
  }

  res.status(500).json({
    jsonrpc: "2.0",
    error: {
      code: -32603,
      message: "Internal server error",
    },
    id: null,
  });
}

export async function runHttp(allowedDirectories: string[]): Promise<void> {
  const config = readHttpConfig(process.env);
  const app = createHttpApp(config, allowedDirectories);

  await new Promise<void>((resolve, reject) => {
    const httpServer = createHttpServer(app);
    httpServer.once("error", reject);
    httpServer.listen(config.port, () => {
      console.error(`MCP HTTP server listening on :${config.port}`);
      resolve();
    });
  });
}

export interface HttpConfig {
  port: number;
  authServerUrl: string;
  scriveBaseUrl: string;
  resourceUrl: string;
  scopes: string[];
  corsOrigins: string[];
  disableDnsRebindingProtection: boolean;
}

export function readHttpConfig(env: NodeJS.ProcessEnv): HttpConfig {
  return {
    port: parsePort(requireEnv("PORT", env)),
    authServerUrl: requireEnv("AUTH_SERVER_URL", env),
    scriveBaseUrl: requireEnv("SCRIVE_BASE_URL", env),
    resourceUrl: requireEnv("RESOURCE_URL", env),
    scopes: requireEnv("SCOPES", env).split(/\s+/).filter(Boolean),
    corsOrigins: parseOrigins(requireEnv("ALLOWED_CORS_ORIGINS", env)),
    disableDnsRebindingProtection: env.DISABLE_DNS_REBINDING_PROTECTION === "true",
  };
}

export function createHttpApp(config: HttpConfig, allowedDirectories: string[]) {
  const app = createMcpExpressApp({
    host: "0.0.0.0",
    allowedHosts: config.disableDnsRebindingProtection
      ? undefined
      : allowedHostnames(config.resourceUrl),
  });

  // Passthrough: the bearer token is forwarded to the Scrive API as-is.
  // The Scrive API validates the token; no local verification is performed.
  // expiresAt is a synthetic value to satisfy the middleware's interface — actual
  // token validity is enforced by the upstream Scrive API. Introspecting via Hydra
  // here would be redundant since the upstream call introspects the same token again.
  const authMiddleware = requireBearerAuth({
    verifier: {
      verifyAccessToken: async (token) => ({
        token,
        clientId: "scrive-mcp",
        scopes: config.scopes,
        expiresAt: Date.now() / 1000 + 3600,
      }),
    },
    resourceMetadataUrl: new URL("/.well-known/oauth-protected-resource", config.resourceUrl).href,
  });
  const corsMiddleware = createCorsMiddleware(config.corsOrigins);

  app.use(corsMiddleware);
  app.options("/mcp", (_req, res) => {
    res.status(204).end();
  });
  app.use(
    "/.well-known/oauth-protected-resource",
    metadataHandler({
      resource: config.resourceUrl,
      authorization_servers: [config.authServerUrl],
      scopes_supported: config.scopes,
    }),
  );

  app.post("/mcp", authMiddleware, async (req, res) => {
    const token = req.auth!.token;
    const clientConfig = { baseUrl: config.scriveBaseUrl, authHeader: `Bearer ${token}` };
    const documentClient = new DocumentClient(clientConfig);
    const journeyClient = new JourneyClient(clientConfig);
    const server = createServer({
      documentClient,
      journeyClient,
      allowedDirectories,
      isRemote: true,
    });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      res.on("close", () => {
        void transport.close();
        void server.close();
      });
    } catch (error) {
      console.error("Error handling MCP request:", error);
      internalError(res);
    }
  });

  app.get("/mcp", authMiddleware, (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    });
  });

  app.delete("/mcp", authMiddleware, (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    });
  });

  return app;
}

function requireEnv(key: string, env: NodeJS.ProcessEnv): string {
  const value = env[key];
  if (!value) {
    throw new Error(`missing required environment variable: ${key}`);
  }

  return value;
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`invalid port: ${value}`);
  }
  return port;
}

function parseOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function createCorsMiddleware(allowedOrigins: string[]): RequestHandler {
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("access-control-allow-origin", origin);
      res.setHeader("vary", "origin");
      res.setHeader(
        "access-control-allow-headers",
        "authorization, content-type, mcp-session-id, last-event-id",
      );
      res.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
    }

    next();
  };
}

function allowedHostnames(resourceUrl: string): string[] {
  const hostname = new URL(resourceUrl).hostname;
  return [...new Set([hostname, "localhost", "127.0.0.1", "[::1]"])];
}
