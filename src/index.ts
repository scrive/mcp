import { runAuth } from "./commands/auth.js";
import { runHttp } from "./commands/http.js";
import { runStdio } from "./commands/stdio.js";
import { normalizeDirectories } from "./path-validation.js";

function execName(): string {
  const value = process.argv[1];
  if (!value) {
    return "scrive-mcp";
  }

  return value.split("/").pop() ?? "scrive-mcp";
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (!command) {
    console.error(`usage: ${execName()} <command>`);
    process.exitCode = 1;
    return;
  }

  const allowedDirectories = await normalizeDirectories(process.argv.slice(3));

  switch (command) {
    case "auth":
      await runAuth();
      return;
    case "stdio":
      await runStdio(allowedDirectories);
      return;
    case "http":
      await runHttp(allowedDirectories);
      return;
    default:
      console.error(`unknown command: ${command}`);
      process.exitCode = 1;
      return;
  }
}

await main();
