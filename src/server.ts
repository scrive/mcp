import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getTimeHandler } from "./tools/get-time.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "scrive-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "get_time",
    { description: "Returns the current server time" },
    getTimeHandler(),
  );

  return server;
}
