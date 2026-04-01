import { HttpClient, type HttpClientConfig } from "../base-client.js";
import type {
  JourneyDocument,
  JourneyDraft,
  JourneyListDraftsResponse,
  JourneyStartFlowResponse,
} from "./types.js";

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

  async addDocumentToDraft(draftId: string, name: string, pdf: string): Promise<JourneyDocument> {
    const response = await this.request<JourneyDocument>({
      url: `/journey/external/drafts/${draftId}/documents`,
      method: "POST",

      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, pdf }),
    });
    return response.data;
  }

  async listFlowDrafts(limit: number, page?: string): Promise<JourneyListDraftsResponse> {
    const params: Record<string, string> = { limit: String(limit) };
    if (page) {
      params.page = page;
    }

    const response = await this.request<JourneyListDraftsResponse>({
      url: "/journey/external/drafts",
      method: "GET",

      params,
    });
    return response.data;
  }

  async getFlowDraft(draftId: string): Promise<JourneyDraft> {
    const response = await this.request<JourneyDraft>({
      url: `/journey/external/drafts/${draftId}`,
      method: "GET",
    });
    return response.data;
  }

  async deleteFlowDraft(draftId: string): Promise<void> {
    await this.request({
      url: `/journey/external/drafts/${draftId}`,
      method: "DELETE",
    });
  }

  async startFlow(draftId: string): Promise<JourneyStartFlowResponse> {
    const response = await this.request<JourneyStartFlowResponse>({
      url: `/journey/external/drafts/${draftId}/start`,
      method: "POST",
    });
    return response.data;
  }
}
