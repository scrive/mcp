import { z } from "zod";

import type { JourneyClient } from "../scrive/journey/client.js";

export const createFlowDraftConfig = {
  description:
    "Creates a new flow draft in Scrive. Use this for anything more advanced than sending a single document.",
  inputSchema: z.object({
    process_title: z.string(),
  }),
};

export interface CreateFlowDraftArgs {
  process_title: string;
}

export function createFlowDraftHandler(client: JourneyClient) {
  return async ({ process_title }: CreateFlowDraftArgs) => {
    if (!process_title) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: "process_title is required" }],
      };
    }

    try {
      const response = await client.createFlowDraft(process_title);

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
            text: `Flow draft created successfully with ID: ${response.id}`,
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
