import { z } from "zod";

import type { DocumentClient } from "../scrive/document/client.js";
import type { ScriveDocument } from "../scrive/document/types.js";

export const DOCUMENT_PROPERTIES = [
  "id",
  "title",
  "parties",
  "file",
  "sealed_file",
  "author_attachments",
  "ctime",
  "mtime",
  "timeout_time",
  "auto_remind_time",
  "status",
  "days_to_sign",
  "days_to_remind",
  "display_options",
  "invitation_message",
  "sms_invitation_message",
  "confirmation_message",
  "sms_confirmation_message",
  "lang",
  "api_callback_url",
  "object_version",
  "access_token",
  "date_format",
  "timezone",
  "tags",
  "is_template",
  "is_saved",
  "is_shared",
  "is_trashed",
  "is_deleted",
] as const satisfies readonly (keyof ScriveDocument)[];

export type DocumentProperty = (typeof DOCUMENT_PROPERTIES)[number];

export function selectDocumentProperties(
  document: ScriveDocument,
  properties?: DocumentProperty[],
): Partial<ScriveDocument> {
  return properties?.length
    ? Object.fromEntries(properties.map((key) => [key, document[key]]))
    : document;
}

export const getDocumentConfig = {
  description: "Retrieves a document's full JSON representation",
  inputSchema: z.object({
    document_id: z.string().min(1),
    properties: z
      .array(z.enum(DOCUMENT_PROPERTIES))
      .optional()
      .describe(
        "Filters the returned JSON to only these top-level document properties. Omit to return the full document.",
      ),
  }),
  annotations: {
    title: "Get Document",
    readOnlyHint: true,
    openWorldHint: true,
  },
};

export type GetDocumentArgs = z.infer<typeof getDocumentConfig.inputSchema>;

export function getDocumentHandler(client: DocumentClient) {
  return async ({ document_id, properties }: GetDocumentArgs) => {
    try {
      const document = await client.getDocument(document_id);
      const result = selectDocumentProperties(document, properties);

      return {
        isError: false,
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
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
