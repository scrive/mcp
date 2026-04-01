import { z } from "zod";

import type { JourneyClient } from "../scrive/journey/client.js";

export const deleteFlowDraftConfig = {
  description: "Deletes a Journey flow draft in Scrive",
  inputSchema: z.object({
    draft_id: z.string(),
  }),
};

export interface DeleteFlowDraftArgs {
  draft_id: string;
}

export function deleteFlowDraftHandler(client: JourneyClient) {
  return async ({ draft_id }: DeleteFlowDraftArgs) => {
    try {
      await client.deleteFlowDraft(draft_id);
      return {
        isError: false,
        content: [{ type: "text" as const, text: `Flow draft ${draft_id} deleted successfully` }],
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
