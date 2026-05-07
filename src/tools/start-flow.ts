import { z } from "zod";

import type { JourneyClient } from "../scrive/journey/client.js";

export const startFlowConfig = {
  description: "Starts a Journey flow draft, creating a running flow instance",
  inputSchema: z.object({
    draft_id: z.string(),
  }),
  annotations: {
    title: "Start Flow",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
};

export interface StartFlowArgs {
  draft_id: string;
}

export function startFlowHandler(client: JourneyClient) {
  return async ({ draft_id }: StartFlowArgs) => {
    try {
      const response = await client.startFlow(draft_id);
      if (!response.flow_id) {
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
          { type: "text" as const, text: `Flow started successfully with ID: ${response.flow_id}` },
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
