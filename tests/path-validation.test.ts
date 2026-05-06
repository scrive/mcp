import { mkdtemp, realpath, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { normalizeDirectories, validatePath } from "../src/path-validation.js";

async function makeTmpDir(prefix: string): Promise<string> {
  const raw = await mkdtemp(path.join(os.tmpdir(), prefix));
  return realpath(raw);
}

describe("validatePath", () => {
  it("allows a file inside an allowed directory", async () => {
    const tmpDir = await makeTmpDir("test-");
    const filePath = path.join(tmpDir, "doc.pdf");
    await writeFile(filePath, "fake-pdf");

    const result = await validatePath(filePath, [tmpDir]);
    expect(result).toContain("doc.pdf");
  });

  it("rejects a file outside allowed directories", async () => {
    const allowed = await makeTmpDir("allowed-");
    const forbidden = await makeTmpDir("forbidden-");
    const filePath = path.join(forbidden, "secret.txt");
    await writeFile(filePath, "secret");

    await expect(validatePath(filePath, [allowed])).rejects.toThrow("Access denied");
  });

  it("rejects when no allowed directories are configured", async () => {
    await expect(validatePath("/any/file", [])).rejects.toThrow(
      "no allowed directories configured",
    );
  });

  it("rejects path traversal via ..", async () => {
    const allowed = await makeTmpDir("allowed-");
    const forbidden = await makeTmpDir("forbidden-");
    const filePath = path.join(forbidden, "secret.txt");
    await writeFile(filePath, "secret");

    // Construct a traversal path that starts inside allowed but escapes
    const traversal = path.join(allowed, "..", path.basename(forbidden), "secret.txt");
    await expect(validatePath(traversal, [allowed])).rejects.toThrow("Access denied");
  });

  it("rejects symlinks pointing outside allowed directories", async () => {
    const allowed = await makeTmpDir("allowed-");
    const forbidden = await makeTmpDir("forbidden-");
    const secretFile = path.join(forbidden, "secret.txt");
    await writeFile(secretFile, "secret");

    const linkPath = path.join(allowed, "link.txt");
    await symlink(secretFile, linkPath);

    await expect(validatePath(linkPath, [allowed])).rejects.toThrow(
      "symlink target outside allowed directories",
    );
  });

  it("allows a nonexistent file when the parent is within bounds", async () => {
    const tmpDir = await makeTmpDir("test-");
    const filePath = path.join(tmpDir, "new-file.pdf");

    const result = await validatePath(filePath, [tmpDir]);
    expect(result).toBe(filePath);
  });

  it("allows the allowed directory itself as a path", async () => {
    const tmpDir = await makeTmpDir("test-");

    const result = await validatePath(tmpDir, [tmpDir]);
    expect(result).toBeTruthy();
  });
});

describe("normalizeDirectories", () => {
  it("resolves real directory paths", async () => {
    const tmpDir = await makeTmpDir("test-");
    const result = await normalizeDirectories([tmpDir]);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every((directory) => path.isAbsolute(directory))).toBe(true);
  });

  it("deduplicates identical paths", async () => {
    const tmpDir = await makeTmpDir("test-");
    const result = await normalizeDirectories([tmpDir, tmpDir]);
    const unique = [...new Set(result)];
    expect(result).toEqual(unique);
  });

  it("handles nonexistent directories gracefully", async () => {
    const result = await normalizeDirectories(["/nonexistent/path/12345"]);
    expect(result).toEqual(["/nonexistent/path/12345"]);
  });

  it("expands ~ to the home directory", async () => {
    const result = await normalizeDirectories(["~"]);
    expect(result).toContain(os.homedir());
  });

  it("expands ~/... paths to absolute home-relative paths", async () => {
    const result = await normalizeDirectories(["~/Documents"]);
    expect(result).toContain(path.join(os.homedir(), "Documents"));
  });

  it("does not expand a path that merely contains ~ but does not start with ~/", async () => {
    const result = await normalizeDirectories(["/some/~path"]);
    expect(result).toContain("/some/~path");
  });
});
