import { z } from "zod";

import type { JourneyClient } from "../scrive/journey/client.js";

export const getFlowDraftConfig = {
  description: "Retrieves a Journey flow draft from Scrive",
  inputSchema: z.object({
    draft_id: z.string(),
  }),
};

export interface GetFlowDraftArgs {
  draft_id: string;
}

export function getFlowDraftHandler(client: JourneyClient) {
  return async ({ draft_id }: GetFlowDraftArgs) => {
    try {
      const response = await client.getFlowDraft(draft_id);
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
