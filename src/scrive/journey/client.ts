import { HttpClient, type HttpClientConfig } from "../base-client.js";
import type { JourneyDraft } from "./types.js";

export class JourneyClient extends HttpClient {
  constructor(config: HttpClientConfig) {
    super(config);
    this.headers["x-scrive-app"] = "scrive-mcp";
  }
  async createFlowDraft(processTitle: string): Promise<JourneyDraft> {
    const response = await this.request<JourneyDraft>({
      url: "/journey/external/drafts",
      method: "POST",

      headers: { "content-type": "application/json" },
      body: JSON.stringify({ process_title: processTitle }),
    });
    return response.data;
  }

  async addDocumentToDraft(
    draftId: string,
    name: string,
    pdf: string,
  ): Promise<JourneyMutationResponse> {
    const response = await this.request<JourneyMutationResponse>({
      url: `/journey/external/drafts/${draftId}/documents`,
      method: "POST",

      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, pdf }),
    });
    return response.data;
  }
}
