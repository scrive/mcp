import { readFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { validatePath } from "../path-validation.js";
import type { DocumentClient } from "../scrive/document/client.js";

export const createDocumentConfig = {
  description: "Reads a local PDF file and uploads it to Scrive as a new document",
  inputSchema: {
    file_path: z.string().describe("ABSOLUTE path to the PDF file"),
  },
};

export interface CreateDocumentArgs {
  file_path: string;
}

export function createDocumentHandler(client: DocumentClient, allowedDirectories: string[]) {
  return async ({ file_path }: CreateDocumentArgs) => {
    if (!path.isAbsolute(file_path)) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: "file_path must be an absolute path" }],
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

    try {
      const buffer = await readFile(validatedPath);
      const file = new File([buffer], path.basename(validatedPath), { type: "application/pdf" });
      const document = await client.createDocument(file);

      return {
        isError: false,
        content: [
          { type: "text" as const, text: `Document created successfully with ID: ${document.id}` },
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
