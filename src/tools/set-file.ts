import { readFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { validatePath } from "../path-validation.js";
import type { DocumentClient } from "../scrive/document/client.js";

export const setFileConfig = {
  description: "Reads a local PDF file and sets it as the main file of a document in Preparation",
  inputSchema: z.object({
    document_id: z.string(),
    file_path: z.string().describe("ABSOLUTE path to the PDF file"),
  }),
  annotations: {
    title: "Set Document Main File",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export interface SetFileArgs {
  document_id: string;
  file_path: string;
}

export function setFileHandler(client: DocumentClient, allowedDirectories: string[]) {
  return async ({ document_id, file_path }: SetFileArgs) => {
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

    try {
      const buffer = await readFile(validatedPath);
      const file = new File([buffer], path.basename(validatedPath), { type: "application/pdf" });
      await client.setFile(document_id, file);

      return {
        isError: false,
        content: [{ type: "text" as const, text: `Main file set on document ${document_id}.` }],
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
