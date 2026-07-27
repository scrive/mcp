import { writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { validatePath } from "../path-validation.js";
import type { DocumentClient } from "../scrive/document/client.js";
import type { ScriveDocument } from "../scrive/document/types.js";

export function documentFileName(document: ScriveDocument): string {
  const name = document.sealed_file?.name ?? document.file?.name;
  if (name) {
    return ensurePdfExtension(path.basename(name));
  }
  const title = document.title?.trim();
  return `${title ? sanitizeName(title) : document.id}.pdf`;
}

function sanitizeName(value: string): string {
  return value.replace(/[^\w.\- ]+/g, "_").trim();
}

function ensurePdfExtension(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

async function writeWithoutOverwrite(
  dir: string,
  fileName: string,
  data: Buffer,
  allowedDirectories: string[],
): Promise<string> {
  const ext = path.extname(fileName);
  const stem = path.basename(fileName, ext);
  for (let counter = 0; ; counter++) {
    const name = counter === 0 ? fileName : `${stem} (${counter})${ext}`;
    const target = await validatePath(path.join(dir, name), allowedDirectories);
    try {
      await writeFile(target, data, { flag: "wx" });
      return target;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
    }
  }
}

export const downloadDocumentConfig = {
  description:
    "Downloads a document's main PDF (the signed/sealed file once complete) and writes it to a local directory",
  inputSchema: z.object({
    document_id: z.string(),
    output_dir: z
      .string()
      .optional()
      .describe(
        "ABSOLUTE directory to write the PDF into. Defaults to the first allowed directory. The filename is taken from the document.",
      ),
  }),
  annotations: {
    title: "Download Document",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export interface DownloadDocumentArgs {
  document_id: string;
  output_dir?: string;
}

export function downloadDocumentHandler(client: DocumentClient, allowedDirectories: string[]) {
  return async ({ document_id, output_dir }: DownloadDocumentArgs) => {
    const dir = output_dir ?? allowedDirectories[0];
    if (!dir) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: "no allowed directories configured" }],
      };
    }
    if (!path.isAbsolute(dir)) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: "output_dir must be an absolute path" }],
      };
    }

    let validatedDir: string;
    try {
      validatedDir = await validatePath(dir, allowedDirectories);
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: (error as Error).message }],
      };
    }

    try {
      const document = await client.getDocument(document_id);
      const data = await client.downloadMainFile(document_id);
      const target = await writeWithoutOverwrite(
        validatedDir,
        documentFileName(document),
        Buffer.from(data),
        allowedDirectories,
      );

      return {
        isError: false,
        content: [
          { type: "text" as const, text: `Document ${document_id} downloaded to ${target}.` },
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
