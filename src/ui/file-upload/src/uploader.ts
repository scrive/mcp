import type { App } from "@modelcontextprotocol/ext-apps";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_FILE_COUNT = 25;

export interface UploadResult {
  fileName: string;
  success: boolean;
  message: string;
}

export interface UploaderConfig {
  multiple: boolean;
  label: string;
  upload: (file: File) => Promise<UploadResult>;
}

export function createUploader(
  app: App,
  dropZone: HTMLElement,
  dropLabel: HTMLElement,
  fileInput: HTMLInputElement,
  statusEl: HTMLElement,
) {
  let config: UploaderConfig | null = null;
  let isUploading = false;
  let isCompleted = false;

  function init(cfg: UploaderConfig) {
    config = cfg;
    fileInput.multiple = cfg.multiple;
    dropLabel.textContent = cfg.label;
  }

  function isLocked(): boolean {
    return isUploading || isCompleted;
  }

  dropZone.addEventListener("click", () => {
    if (!isLocked()) fileInput.click();
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (!isLocked()) dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    if (isLocked() || !config) return;
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    const selected = Array.from(files);
    void processFiles(config.multiple ? selected : selected.slice(0, 1));
  });

  fileInput.addEventListener("change", () => {
    if (isLocked() || !config) return;
    const files = fileInput.files;
    if (files?.length) {
      void processFiles(Array.from(files));
    }
    fileInput.value = "";
  });

  async function processFiles(files: File[]): Promise<void> {
    if (!config) return;

    if (files.length > MAX_FILE_COUNT) {
      showStatus(`Too many files (max ${MAX_FILE_COUNT}).`, "error");
      return;
    }

    isUploading = true;

    try {
      const results: UploadResult[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const label =
          files.length > 1
            ? `Uploading ${i + 1}/${files.length}: ${file.name}\u2026`
            : `Uploading ${file.name}\u2026`;
        showStatus(label, "uploading");

        const error = validateFile(file);
        if (error) {
          results.push({ fileName: file.name, success: false, message: error });
          continue;
        }

        results.push(await config.upload(file));
      }

      const summary = formatSummary(results);
      const hasFailures = results.some((r) => !r.success);
      const hasSuccesses = results.some((r) => r.success);

      showStatus(
        hasFailures ? summary : files.length === 1 ? summary : "All files uploaded!",
        hasFailures ? "error" : "success",
      );

      if (hasSuccesses) {
        isCompleted = true;
        dropZone.classList.add("done");
      }

      await app.updateModelContext({
        content: [{ type: "text", text: summary }],
      });
    } finally {
      isUploading = false;
    }
  }

  function showStatus(message: string, state: "uploading" | "success" | "error") {
    statusEl.textContent = message;
    statusEl.className = `visible ${state}`;
  }

  return { init };
}

function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return `${file.name}: not a PDF file`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `${file.name}: file is too large (max 50 MB)`;
  }
  return null;
}

export function formatSummary(results: UploadResult[]): string {
  if (results.length === 1) return results[0]!.message;

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  const parts: string[] = [];

  if (succeeded.length > 0) {
    parts.push(
      `Uploaded ${succeeded.length}/${results.length} files:`,
      ...succeeded.map((r) => `  \u2713 ${r.message}`),
    );
  }

  if (failed.length > 0) {
    if (succeeded.length === 0) {
      parts.push(`All ${results.length} uploads failed:`);
    } else {
      parts.push("Failed:");
    }
    parts.push(...failed.map((r) => `  \u2717 ${r.fileName}: ${r.message}`));
  }

  return parts.join("\n");
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1]!);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
