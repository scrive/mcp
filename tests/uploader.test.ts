/**
 * @vitest-environment happy-dom
 */
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";

import { createUploader } from "../src/ui/file-upload/src/uploader.js";

function makeDOM() {
  const dropZone = document.createElement("div");
  const dropLabel = document.createElement("p");
  const fileInput = document.createElement("input") as HTMLInputElement;
  fileInput.type = "file";
  const statusEl = document.createElement("div");
  return { dropZone, dropLabel, fileInput, statusEl };
}

function makeFakeApp() {
  return {
    updateModelContext: vi.fn().mockResolvedValue(undefined),
  } as unknown as Parameters<typeof createUploader>[0];
}

function makePdfFile(name: string, sizeBytes = 100): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type: "application/pdf" });
}

describe("createUploader", () => {
  let dom: ReturnType<typeof makeDOM>;
  let app: ReturnType<typeof makeFakeApp>;

  beforeEach(() => {
    dom = makeDOM();
    app = makeFakeApp();
  });

  it("sets multiple attribute and label on init", () => {
    const uploader = createUploader(app, dom.dropZone, dom.dropLabel, dom.fileInput, dom.statusEl);

    uploader.init({
      multiple: true,
      label: "Drop PDFs here",
      upload: vi.fn(),
    });

    expect(dom.fileInput.multiple).toBe(true);
    expect(dom.dropLabel.textContent).toBe("Drop PDFs here");
  });

  it("sets single-file mode correctly", () => {
    const uploader = createUploader(app, dom.dropZone, dom.dropLabel, dom.fileInput, dom.statusEl);

    uploader.init({
      multiple: false,
      label: "Drop a PDF here",
      upload: vi.fn(),
    });

    expect(dom.fileInput.multiple).toBe(false);
    expect(dom.dropLabel.textContent).toBe("Drop a PDF here");
  });

  it("processes a single file and sends summary", async () => {
    const uploadFn = vi.fn().mockResolvedValue({
      fileName: "test.pdf",
      success: true,
      message: "Created with ID: doc-1",
    });

    const uploader = createUploader(app, dom.dropZone, dom.dropLabel, dom.fileInput, dom.statusEl);
    uploader.init({ multiple: false, label: "Drop", upload: uploadFn });

    await simulateFileInput(dom.fileInput, [makePdfFile("test.pdf")]);

    expect(uploadFn).toHaveBeenCalledTimes(1);
    expect(dom.statusEl.textContent).toBe("Created with ID: doc-1");
    expect(dom.statusEl.classList.contains("visible")).toBe(true);
    expect(dom.statusEl.classList.contains("success")).toBe(true);
    expect(app.updateModelContext).toHaveBeenCalledWith({
      content: [{ type: "text", text: "Created with ID: doc-1" }],
    });
  });

  it("processes multiple files sequentially", async () => {
    const calls: string[] = [];
    const uploadFn = vi.fn().mockImplementation(async (file: File) => {
      calls.push(file.name);
      return { fileName: file.name, success: true, message: `Done ${file.name}` };
    });

    const uploader = createUploader(app, dom.dropZone, dom.dropLabel, dom.fileInput, dom.statusEl);
    uploader.init({ multiple: true, label: "Drop", upload: uploadFn });

    await simulateFileInput(dom.fileInput, [
      makePdfFile("a.pdf"),
      makePdfFile("b.pdf"),
      makePdfFile("c.pdf"),
    ]);

    expect(calls).toEqual(["a.pdf", "b.pdf", "c.pdf"]);
    expect(uploadFn).toHaveBeenCalledTimes(3);
    expect(dom.statusEl.textContent).toBe("All files uploaded!");
    expect(dom.statusEl.classList.contains("visible")).toBe(true);
    expect(dom.statusEl.classList.contains("success")).toBe(true);
  });

  it("skips non-PDF files with validation error", async () => {
    const uploadFn = vi.fn().mockResolvedValue({
      fileName: "good.pdf",
      success: true,
      message: "Done",
    });

    const uploader = createUploader(app, dom.dropZone, dom.dropLabel, dom.fileInput, dom.statusEl);
    uploader.init({ multiple: true, label: "Drop", upload: uploadFn });

    await simulateFileInput(dom.fileInput, [
      new File(["x"], "bad.txt", { type: "text/plain" }),
      makePdfFile("good.pdf"),
    ]);

    expect(uploadFn).toHaveBeenCalledTimes(1);
    const sentText = (app.updateModelContext as Mock).mock.calls[0][0].content[0].text as string;
    expect(sentText).toContain("bad.txt: not a PDF file");
    expect(sentText).toContain("Done");
  });

  it("handles upload function failure gracefully", async () => {
    const uploadFn = vi.fn().mockResolvedValue({
      fileName: "fail.pdf",
      success: false,
      message: "Server error",
    });

    const uploader = createUploader(app, dom.dropZone, dom.dropLabel, dom.fileInput, dom.statusEl);
    uploader.init({ multiple: false, label: "Drop", upload: uploadFn });

    await simulateFileInput(dom.fileInput, [makePdfFile("fail.pdf")]);

    expect(dom.statusEl.textContent).toBe("Server error");
    expect(dom.statusEl.classList.contains("visible")).toBe(true);
    expect(dom.statusEl.classList.contains("error")).toBe(true);
  });

  it("prevents concurrent uploads", async () => {
    let resolveUpload: () => void;
    const uploadPromise = new Promise<void>((r) => {
      resolveUpload = r;
    });

    const uploadFn = vi.fn().mockImplementation(async () => {
      await uploadPromise;
      return { fileName: "a.pdf", success: true, message: "Done" };
    });

    const uploader = createUploader(app, dom.dropZone, dom.dropLabel, dom.fileInput, dom.statusEl);
    uploader.init({ multiple: false, label: "Drop", upload: uploadFn });

    // Start first upload (will block)
    const firstUpload = simulateFileInput(dom.fileInput, [makePdfFile("a.pdf")]);

    // Try second upload while first is in progress
    await simulateFileInput(dom.fileInput, [makePdfFile("b.pdf")]);

    // Only one call should have been made
    expect(uploadFn).toHaveBeenCalledTimes(1);

    // Resolve first upload
    resolveUpload!();
    await firstUpload;
  });

  it("locks after a successful upload and ignores further interactions", async () => {
    const uploadFn = vi.fn().mockResolvedValue({
      fileName: "a.pdf",
      success: true,
      message: "Done a.pdf",
    });

    const uploader = createUploader(app, dom.dropZone, dom.dropLabel, dom.fileInput, dom.statusEl);
    uploader.init({ multiple: false, label: "Drop", upload: uploadFn });

    await simulateFileInput(dom.fileInput, [makePdfFile("a.pdf")]);

    expect(uploadFn).toHaveBeenCalledTimes(1);
    expect(dom.dropZone.classList.contains("done")).toBe(true);

    // Subsequent uploads should be ignored
    await simulateFileInput(dom.fileInput, [makePdfFile("b.pdf")]);
    expect(uploadFn).toHaveBeenCalledTimes(1);

    // Click should not open the file picker
    const clickSpy = vi.spyOn(dom.fileInput, "click");
    dom.dropZone.dispatchEvent(new Event("click", { bubbles: true }));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("does not lock when all uploads fail", async () => {
    const uploadFn = vi
      .fn()
      .mockResolvedValueOnce({ fileName: "a.pdf", success: false, message: "Server error" })
      .mockResolvedValueOnce({ fileName: "b.pdf", success: true, message: "Done b.pdf" });

    const uploader = createUploader(app, dom.dropZone, dom.dropLabel, dom.fileInput, dom.statusEl);
    uploader.init({ multiple: false, label: "Drop", upload: uploadFn });

    await simulateFileInput(dom.fileInput, [makePdfFile("a.pdf")]);
    expect(dom.dropZone.classList.contains("done")).toBe(false);

    // A retry after failure should be allowed
    await simulateFileInput(dom.fileInput, [makePdfFile("b.pdf")]);
    expect(uploadFn).toHaveBeenCalledTimes(2);
    expect(dom.dropZone.classList.contains("done")).toBe(true);
  });

  it("limits to first file in single-file drop mode", async () => {
    const uploadFn = vi.fn().mockResolvedValue({
      fileName: "a.pdf",
      success: true,
      message: "Done",
    });

    const uploader = createUploader(app, dom.dropZone, dom.dropLabel, dom.fileInput, dom.statusEl);
    uploader.init({ multiple: false, label: "Drop", upload: uploadFn });

    // Simulate drop with multiple files
    const dt = new DataTransfer();
    dt.items.add(makePdfFile("a.pdf"));
    dt.items.add(makePdfFile("b.pdf"));

    const dropEvent = new Event("drop", { bubbles: true }) as unknown as DragEvent;
    Object.defineProperty(dropEvent, "dataTransfer", { value: dt });
    Object.defineProperty(dropEvent, "preventDefault", { value: () => {} });
    dom.dropZone.dispatchEvent(dropEvent);

    // Wait for async processing
    await vi.waitFor(() => expect(uploadFn).toHaveBeenCalled());

    expect(uploadFn).toHaveBeenCalledTimes(1);
  });
});

async function simulateFileInput(input: HTMLInputElement, files: File[]): Promise<void> {
  const dt = new DataTransfer();
  for (const f of files) dt.items.add(f);
  Object.defineProperty(input, "files", { value: dt.files, writable: true, configurable: true });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  // Let the async processFiles complete
  await new Promise((r) => setTimeout(r, 0));
  await vi.waitFor(() => {});
}
