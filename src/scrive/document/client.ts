import { HttpClient } from "../base-client.js";
import type { ScriveDocument } from "./types.js";

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
}
