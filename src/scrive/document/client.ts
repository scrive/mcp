import { HttpClient } from "../base-client.js";
import type {
  ListDocumentsParams,
  ListDocumentsResponse,
  ScriveDocument,
  UsageStatsParams,
} from "./types.js";

export class DocumentClient extends HttpClient {
  async createDocument(file: File): Promise<ScriveDocument> {
    const formData = new FormData();
    formData.set("file", file);

    const response = await this.request<ScriveDocument>({
      url: "/api/v2/documents/new",
      method: "POST",
      body: formData,
    });
    return response.data;
  }

  async setFile(documentId: string, file: File): Promise<ScriveDocument> {
    const formData = new FormData();
    formData.set("file", file);

    const response = await this.request<ScriveDocument>({
      url: `/api/v2/documents/${documentId}/setfile`,
      method: "POST",
      body: formData,
    });
    return response.data;
  }

  async createFromTemplate(documentId: string): Promise<ScriveDocument> {
    const response = await this.request<ScriveDocument>({
      url: `/api/v2/documents/newfromtemplate/${documentId}`,
      method: "POST",
    });
    return response.data;
  }

  async listDocuments(params: ListDocumentsParams): Promise<ListDocumentsResponse> {
    const queryParams: Record<string, string> = {
      offset: String(params.offset),
      max: String(params.max),
    };
    if (params.filters?.length) {
      queryParams.filter = JSON.stringify(params.filters);
    }
    if (params.sorting?.length) {
      queryParams.sorting = JSON.stringify(params.sorting);
    }

    const response = await this.request<ListDocumentsResponse>({
      url: "/api/v2/documents/list",
      method: "GET",
      params: queryParams,
    });
    return response.data;
  }

  async getDocument(documentId: string): Promise<ScriveDocument> {
    const response = await this.request<ScriveDocument>({
      url: `/api/v2/documents/${documentId}/get`,
      method: "GET",
    });
    return response.data;
  }

  async downloadMainFile(documentId: string): Promise<ArrayBuffer> {
    const response = await this.request<ArrayBuffer>({
      url: `/api/v2/documents/${documentId}/files/main`,
      method: "GET",
    });
    return response.data;
  }

  async updateDocument(
    documentId: string,
    document: Partial<ScriveDocument>,
    objectVersion?: number,
  ): Promise<ScriveDocument> {
    const body = new URLSearchParams({
      document_id: documentId,
      document: JSON.stringify(document),
    });
    if (objectVersion !== undefined) {
      body.set("object_version", String(objectVersion));
    }

    const response = await this.request<ScriveDocument>({
      url: `/api/v2/documents/${documentId}/update`,
      method: "POST",
      body,
    });
    return response.data;
  }

  async startSigning(documentId: string): Promise<void> {
    await this.request({
      url: `/api/v2/documents/${documentId}/start`,
      method: "POST",
    });
  }

  async remindDocument(documentId: string): Promise<void> {
    await this.request({
      url: `/api/v2/documents/${documentId}/remind`,
      method: "POST",
    });
  }

  async cancelDocument(documentId: string): Promise<void> {
    await this.request({
      url: `/api/v2/documents/${documentId}/cancel`,
      method: "POST",
    });
  }

  async getUsageStats(params: UsageStatsParams): Promise<unknown> {
    const { period, ...rest } = params;
    const queryParams = Object.fromEntries(
      Object.entries(rest)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    );

    const response = await this.request<unknown>({
      url: `/api/v2/usagestats/${period}`,
      method: "GET",
      params: queryParams,
    });
    return response.data;
  }
}
