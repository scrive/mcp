import { z } from "zod";

import type { JourneyClient } from "../scrive/journey/client.js";

export const listFlowDraftsConfig = {
  description: "Lists Journey flow drafts with pagination support",
  inputSchema: z.object({
    limit: z.number().optional(),
    page: z.string().optional(),
  }),
};

export interface ListFlowDraftsArgs {
  limit?: number;
  page?: string;
}

export function listFlowDraftsHandler(client: JourneyClient) {
  return async ({ limit, page }: ListFlowDraftsArgs) => {
    try {
      const response = await client.listFlowDrafts(limit ?? 20, page);
      return {
        isError: false,
        content: [{ type: "text" as const, text: JSON.stringify(response) }],
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
