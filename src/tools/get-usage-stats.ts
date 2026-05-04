import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";
import type { UsageStatsParams } from "../scrive/document/types.js";

export const getUsageStatsConfig = {
  description:
    "Retrieves usage statistics from Scrive. Use period 'days' for daily stats (default last 30 days) or 'months' for monthly stats (default last 12 months).",
  inputSchema: z.object({
    period: z.enum(["days", "months"]),
    userGroupID: z.string().optional().describe("User group ID (used when withCompany is true)"),
    withCompany: z.boolean().optional().describe("Include company statistics summary"),
    recursive: z
      .boolean()
      .optional()
      .describe("Include child user group stats (only when withCompany is true)"),
    includeZeroRecords: z.boolean().optional().describe("Include periods with no statistics"),
    fromDate: z
      .string()
      .optional()
      .describe("Lower date bound in ISO 8601 format (YYYY-MM-DD or YYYY-MM)"),
    toDate: z
      .string()
      .optional()
      .describe("Upper date bound in ISO 8601 format (YYYY-MM-DD or YYYY-MM)"),
  }),
};

export type GetUsageStatsArgs = UsageStatsParams;

export function getUsageStatsHandler(client: DocumentClient) {
  return async (args: GetUsageStatsArgs) => {
    try {
      const stats = await client.getUsageStats(args);

      return {
        isError: false,
        content: [{ type: "text" as const, text: JSON.stringify(stats) }],
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
