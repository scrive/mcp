import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { authHeader, loadConfig } from "../config.js";
import { DocumentClient } from "../scrive/document/client.js";
import { createServer } from "../server.js";

export async function runStdio(allowedDirectories: string[]): Promise<void> {
  const config = await loadConfig();
  const auth = authHeader(config);

  const clientConfig = { baseUrl: `https://${config.server}`, authHeader: auth };
  const documentClient = new DocumentClient(clientConfig);

  const server = createServer({
    documentClient,
    allowedDirectories,
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
