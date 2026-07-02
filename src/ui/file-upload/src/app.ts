import { App } from "@modelcontextprotocol/ext-apps";

import { type UploadResult, createUploader, readFileAsBase64 } from "./uploader.js";

const app = new App({ name: "file_upload", version: "1.0.0" });

interface AddDocumentToDraftArgs {
  draft_id?: string;
  name?: string;
}

function createUpload(): (file: File) => Promise<UploadResult> {
  return async (file) => {
    let fileData: string;
    try {
      fileData = await readFileAsBase64(file);
    } catch {
      return { fileName: file.name, success: false, message: "Failed to read file" };
    }
    try {
      const result = await app.callServerTool({
        name: "_create_document_upload",
        arguments: { file_name: file.name, file_data: fileData },
      });
      const text = result.content?.find((b) => b.type === "text")?.text;
      return result.isError
        ? { fileName: file.name, success: false, message: text ?? "Upload failed" }
        : { fileName: file.name, success: true, message: text ?? "Upload successful" };
    } catch (err) {
      return {
        fileName: file.name,
        success: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  };
}

function draftUpload(
  draftId: string,
  nameOverride: string | undefined,
): (file: File) => Promise<UploadResult> {
  return async (file) => {
    const name = nameOverride ?? file.name.replace(/\.pdf$/i, "");
    let fileData: string;
    try {
      fileData = await readFileAsBase64(file);
    } catch {
      return { fileName: file.name, success: false, message: "Failed to read file" };
    }
    try {
      const result = await app.callServerTool({
        name: "_add_document_to_draft_upload",
        arguments: { draft_id: draftId, name, file_name: file.name, file_data: fileData },
      });
      const text = result.content?.find((b) => b.type === "text")?.text;
      return result.isError
        ? { fileName: file.name, success: false, message: text ?? "Upload failed" }
        : { fileName: file.name, success: true, message: text ?? "Uploaded" };
    } catch (err) {
      return {
        fileName: file.name,
        success: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  };
}

const uploader = createUploader(
  app,
  document.getElementById("drop-zone")!,
  document.getElementById("drop-label")!,
  document.getElementById("file-input") as HTMLInputElement,
  document.getElementById("status")!,
);

function init({ draft_id, name }: AddDocumentToDraftArgs): void {
  if (draft_id) {
    uploader.init({
      multiple: true,
      label: "Drop PDFs here",
      upload: draftUpload(draft_id, name),
    });
  } else {
    uploader.init({
      multiple: false,
      label: "Drop a PDF here",
      upload: createUpload(),
    });
  }
}

app.ontoolresult = (result) => init((result.structuredContent ?? {}) as AddDocumentToDraftArgs);

await app.connect();
