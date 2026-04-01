import { HttpClient } from "../base-client.js";
import type { ListDocumentsParams, ListDocumentsResponse, ScriveDocument } from "./types.js";

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

  async updateDocument(documentId: string, document: ScriveDocument): Promise<ScriveDocument> {
    const response = await this.request<ScriveDocument>({
      url: `/api/v2/documents/${documentId}/update`,
      method: "POST",
      body: new URLSearchParams({
        document_id: documentId,
        document: JSON.stringify(document),
      }),
    });
    return response.data;
  }

  async startSigning(documentId: string): Promise<void> {
    await this.request({
      url: `/api/v2/documents/${documentId}/start`,
      method: "POST",
    });
  }
}
