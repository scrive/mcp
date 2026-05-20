import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";
import type {
  DocumentFilter,
  DocumentSortOption,
  DocumentStatus,
  ListDocumentsResponse,
} from "../scrive/document/types.js";

export const listDocumentsConfig = {
  description: "Lists documents with various filtering and sorting options",
  inputSchema: z.object({
    max_results: z.number().optional(),
    offset: z.number().optional(),
    status: z
      .array(
        z.enum([
          "preparation",
          "awaiting_start",
          "pending",
          "closed",
          "canceled",
          "timedout",
          "rejected",
          "document_error",
        ]),
      )
      .optional(),
    mtime: z
      .object({
        start_time: z.string().optional(),
        end_time: z.string().optional(),
      })
      .optional(),
    tag: z
      .object({
        name: z.string(),
        value: z.string(),
      })
      .optional()
      .transform((tag) => (tag?.name && tag?.value ? tag : undefined)),
    has_tag: z.string().optional(),
    is_author: z.boolean().optional(),
    author_id: z.string().optional(),
    user_can_sign: z.string().optional(),
    search_text: z.string().optional(),
    is_template: z.boolean().optional(),
    is_not_template: z.boolean().optional(),
    is_in_trash: z.boolean().optional(),
    is_not_in_trash: z.boolean().optional(),
    is_signable_on_pad: z.boolean().optional(),
    sorting: z
      .array(
        z.object({
          sort_by: z.enum(["title", "status", "mtime", "author"]),
          order: z.enum(["ascending", "descending"]),
        }),
      )
      .optional(),
  }),
  annotations: {
    title: "List Documents",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export interface MtimeFilter {
  start_time?: string;
  end_time?: string;
}

export interface TagFilter {
  name: string;
  value: string;
}

export interface ListDocumentsArgs {
  max_results?: number;
  offset?: number;
  status?: DocumentStatus[];
  mtime?: MtimeFilter;
  tag?: TagFilter;
  has_tag?: string;
  is_author?: boolean;
  author_id?: string;
  user_can_sign?: string;
  search_text?: string;
  is_template?: boolean;
  is_not_template?: boolean;
  is_in_trash?: boolean;
  is_not_in_trash?: boolean;
  is_signable_on_pad?: boolean;
  sorting?: DocumentSortOption[];
}

export function listDocumentsHandler(client: DocumentClient) {
  return async (args: ListDocumentsArgs) => {
    const offset = args.offset ?? 0;
    const maxResults = args.max_results ?? 20;

    try {
      const filters = buildFilters(args);
      const response = await client.listDocuments({
        offset,
        max: maxResults,
        filters: filters.length > 0 ? filters : undefined,
        sorting: args.sorting?.length ? args.sorting : undefined,
      });

      return {
        isError: false,
        content: [
          { type: "text" as const, text: JSON.stringify(formatListResponse(response, offset)) },
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

export function buildFilters(args: ListDocumentsArgs): DocumentFilter[] {
  const filters: DocumentFilter[] = [];

  if (args.status?.length) {
    filters.push({ filter_by: "status", statuses: args.status });
  }
  if (args.mtime) {
    const filter: Extract<DocumentFilter, { filter_by: "mtime" }> = { filter_by: "mtime" };
    if (args.mtime.start_time) {
      filter.start_time = args.mtime.start_time;
    }
    if (args.mtime.end_time) {
      filter.end_time = args.mtime.end_time;
    }
    filters.push(filter);
  }
  if (args.tag) {
    filters.push({ filter_by: "tag", name: args.tag.name, value: args.tag.value });
  }
  if (args.has_tag) {
    filters.push({ filter_by: "has_tag", name: args.has_tag });
  }
  if (args.is_author) {
    filters.push({ filter_by: "is_author" });
  }
  if (args.author_id) {
    filters.push({ filter_by: "author", user_id: args.author_id });
  }
  if (args.user_can_sign) {
    filters.push({ filter_by: "user_can_sign", user_id: args.user_can_sign });
  }
  if (args.search_text) {
    filters.push({ filter_by: "text", text: args.search_text });
  }
  if (args.is_template) {
    filters.push({ filter_by: "is_template" });
  }
  if (args.is_not_template) {
    filters.push({ filter_by: "is_not_template" });
  }
  if (args.is_in_trash) {
    filters.push({ filter_by: "is_in_trash" });
  }
  if (args.is_not_in_trash) {
    filters.push({ filter_by: "is_not_in_trash" });
  }
  if (args.is_signable_on_pad) {
    filters.push({ filter_by: "is_signable_on_pad" });
  }

  return filters;
}

function formatListResponse(response: ListDocumentsResponse, offset: number) {
  return {
    offset,
    total_matching: Number(response.total_matching ?? 0),
    documents: (response.documents ?? []).map((document) => ({
      id: document.id,
      title: document.title,
      status: document.status,
      mtime: document.mtime,
    })),
  };
}
