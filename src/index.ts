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

  switch (command) {
    default:
      console.error(`unknown command: ${command}`);
      process.exitCode = 1;
      return;
  }
}

await main();
