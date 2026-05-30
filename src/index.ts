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

function usage(): string {
  return `${execName()} ${__VERSION__}\nusage: ${execName()} <auth|stdio|http|version>`;
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (!command) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  if (command === "version") {
    console.log(__VERSION__);
    return;
  }

  const allowedDirectories = await normalizeDirectories(process.argv.slice(3));

  switch (command) {
    case "auth":
      try {
        await runAuth();
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
      }
      return;
    case "stdio":
      await runStdio(allowedDirectories);
      return;
    case "http":
      await runHttp(allowedDirectories);
      return;
    default:
      console.error(`unknown command: ${command}\n${usage()}`);
      process.exitCode = 1;
      return;
  }
}

await main();
