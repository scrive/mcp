import { realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Validates that a file path is within the allowed directories.
 *
 * Mirrors the approach from the official MCP filesystem server:
 * resolves the path to an absolute form, checks it against the
 * allowed list, then resolves symlinks and checks again.
 */
export async function validatePath(
  filePath: string,
  allowedDirectories: string[],
): Promise<string> {
  if (allowedDirectories.length === 0) {
    throw new Error("Access denied - no allowed directories configured");
  }

  const absolute = path.resolve(filePath);
  const normalized = path.normalize(absolute);

  if (!isWithinAllowedDirectories(normalized, allowedDirectories)) {
    throw new Error(
      `Access denied - path outside allowed directories: ${normalized} not in ${allowedDirectories.join(", ")}`,
    );
  }

  // Resolve symlinks and verify the real path is also within bounds.
  try {
    const real = await realpath(absolute);
    if (!isWithinAllowedDirectories(real, allowedDirectories)) {
      throw new Error(
        `Access denied - symlink target outside allowed directories: ${real} not in ${allowedDirectories.join(", ")}`,
      );
    }
    return real;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // File doesn't exist yet — validate the parent directory instead.
      const parentDir = path.dirname(absolute);
      try {
        const realParent = await realpath(parentDir);
        if (!isWithinAllowedDirectories(realParent, allowedDirectories)) {
          throw new Error(
            `Access denied - parent directory outside allowed directories: ${realParent} not in ${allowedDirectories.join(", ")}`,
          );
        }
        return absolute;
      } catch {
        throw new Error(`Parent directory does not exist: ${parentDir}`);
      }
    }
    throw error;
  }
}

function isWithinAllowedDirectories(absolutePath: string, allowedDirectories: string[]): boolean {
  return allowedDirectories.some((directory) => {
    if (absolutePath === directory) {
      return true;
    }
    return absolutePath.startsWith(directory + path.sep);
  });
}

/**
 * Normalizes raw directory arguments into resolved, absolute paths.
 * Resolves symlinks when the directory exists.
 */
function expandHome(filepath: string): string {
  if (filepath === "~" || filepath.startsWith("~/")) {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

export async function normalizeDirectories(directories: string[]): Promise<string[]> {
  const results = await Promise.all(
    directories.map(async (directory) => {
      const absolute = path.resolve(expandHome(directory));
      const normalized = path.normalize(absolute);
      try {
        const resolved = await realpath(absolute);
        // Include both the normalized form and the resolved (real) form
        // so that both the given path and its symlink target are allowed.
        if (normalized !== resolved) {
          return [normalized, resolved];
        }
        return [resolved];
      } catch {
        return [normalized];
      }
    }),
  );

  return [...new Set(results.flat())];
}
