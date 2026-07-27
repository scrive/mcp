import { App } from "@modelcontextprotocol/ext-apps";

const app = new App({ name: "file_download", version: "1.0.0" });

const button = document.getElementById("download-btn") as HTMLButtonElement;
const errorEl = document.getElementById("error")!;

let documentId = "";

async function download(): Promise<void> {
  errorEl.textContent = "";
  try {
    const result = await app.callServerTool({
      name: "_download_document",
      arguments: { document_id: documentId },
    });
    if (result.isError) {
      const text = result.content?.find((b) => b.type === "text")?.text;
      throw new Error(text ?? "Failed to prepare the document");
    }

    const { file_name, file_data } = result.structuredContent as {
      file_name: string;
      file_data: string;
    };
    await app.downloadFile({
      contents: [
        {
          type: "resource",
          resource: {
            uri: `file:///${encodeURIComponent(file_name)}`,
            mimeType: "application/pdf",
            blob: file_data,
          },
        },
      ],
    });
  } catch (err) {
    errorEl.textContent = err instanceof Error ? err.message : String(err);
  }
}

button.addEventListener("click", () => {
  void download();
});

app.ontoolresult = (result) => {
  const { document_id } = (result.structuredContent ?? {}) as { document_id?: string };
  documentId = document_id ?? "";
};

await app.connect();
