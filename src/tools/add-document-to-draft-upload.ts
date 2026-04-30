import { z } from "zod";

import type { JourneyClient } from "../scrive/journey/client.js";

export const addDocumentToDraftUploadConfig = {
  description:
    "Internal: receives a base64-encoded PDF from the file picker UI and adds it to a Journey flow draft",
  inputSchema: {
    draft_id: z.string(),
    name: z.string().optional().describe("Document name (defaults to filename without extension)"),
    file_name: z.string().describe("Original filename of the PDF"),
    file_data: z.string().describe("Base64-encoded PDF content"),
  },
};

export interface AddDocumentToDraftUploadArgs {
  draft_id: string;
  name?: string;
  file_name: string;
  file_data: string;
}

export function addDocumentToDraftUploadHandler(client: JourneyClient) {
  return async ({ draft_id, name, file_name, file_data }: AddDocumentToDraftUploadArgs) => {
    const resolvedName = name ?? file_name.replace(/\.pdf$/i, "");
    try {
      const response = await client.addDocumentToDraft(draft_id, resolvedName, file_data);

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
