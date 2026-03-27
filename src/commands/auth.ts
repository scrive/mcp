import { stdin as input, stderr as output } from "node:process";
import readline from "node:readline/promises";
import { Writable } from "node:stream";

import { type AuthCredentials, writeConfig } from "../config.js";

async function prompt(rl: readline.Interface, label: string): Promise<string> {
  const value = (await rl.question(label)).trim();
  if (!value) {
    throw new Error(
      `${label
        .toLowerCase()
        .replace(/[:(].*$/, "")
        .trim()} is required`,
    );
  }

  return value;
}

class MutedWritable extends Writable {
  #muted = false;

  public setMuted(muted: boolean): void {
    this.#muted = muted;
  }

  public override _write(
    chunk: string | Uint8Array,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (this.#muted) {
      callback();
      return;
    }

    output.write(chunk, encoding, callback);
  }
}

async function readPassword(label: string): Promise<string> {
  const mutedOutput = new MutedWritable();
  const passwordRl = readline.createInterface({
    input,
    output: mutedOutput,
    terminal: true,
  });

  try {
    mutedOutput.setMuted(true);
    output.write(label);
    const password = await passwordRl.question("");
    output.write("\n");
    return password;
  } finally {
    mutedOutput.setMuted(false);
    passwordRl.close();
  }
}

export async function runAuth(fetchImpl: typeof fetch = fetch): Promise<void> {
  const rl = readline.createInterface({ input, output });

  try {
    const server = await prompt(rl, "Server (e.g. scrive.com): ");
    const email = await prompt(rl, "Email: ");
    rl.close();
    const password = await readPassword("Password: ");
    if (!password) {
      throw new Error("password is required");
    }

    const body = new URLSearchParams();
    body.set("email", email);
    body.set("password", password);

    const response = await fetchImpl(`https://${server}/api/v2/getpersonaltoken`, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`authentication failed (HTTP ${response.status})`);
    }

    const credentials = (await response.json()) as AuthCredentials;
    await writeConfig({
      server,
      auth: credentials,
    });

    output.write("Authentication successful. Config saved.\n");
  } finally {
    rl.close();
  }
}
