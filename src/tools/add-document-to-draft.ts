import { readFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { validatePath } from "../path-validation.js";
import type { JourneyClient } from "../scrive/journey/client.js";

export const addDocumentToDraftConfig = {
  description: "Adds a PDF document to an existing Journey flow draft",
  inputSchema: z.object({
    file_path: z.string().describe("ABSOLUTE path to the PDF file"),
    draft_id: z.string(),
    name: z.string().optional(),
  }),
};

export interface AddDocumentToDraftArgs {
  file_path: string;
  draft_id: string;
  name?: string;
}

export function addDocumentToDraftHandler(client: JourneyClient, allowedDirectories: string[]) {
  return async ({ file_path, draft_id, name }: AddDocumentToDraftArgs) => {
    if (!path.isAbsolute(file_path)) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: "file_path must be an absolute path" }],
      };
    }
    if (path.extname(file_path).toLowerCase() !== ".pdf") {
      return {
        isError: true,
        content: [{ type: "text" as const, text: "file must be a PDF" }],
      };
    }

    let validatedPath: string;
    try {
      validatedPath = await validatePath(file_path, allowedDirectories);
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: (error as Error).message }],
      };
    }

    const resolvedName = name ?? path.basename(validatedPath, ".pdf");

    try {
      const buffer = await readFile(validatedPath);
      const pdf = buffer.toString("base64");
      const response = await client.addDocumentToDraft(draft_id, resolvedName, pdf);

      if (!response.id) {
        return {
          isError: true,
          content: [
            { type: "text" as const, text: `unexpected response: ${JSON.stringify(response)}` },
          ],
        };
      }

      return {
        isError: false,
        content: [
          {
            type: "text" as const,
            text: `Document '${resolvedName}' added to draft successfully with ID: ${response.id}`,
          },
        ],
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          { type: "text" as const, text: error instanceof Error ? error.message : String(error) },
        ],
      };
    }
  };
}
