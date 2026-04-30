import { describe, expect, it } from "vitest";

import { type UploadResult, formatSummary } from "../src/ui/file-upload/src/uploader.js";

describe("formatSummary", () => {
  it("returns the message directly for a single result", () => {
    const results: UploadResult[] = [
      { fileName: "a.pdf", success: true, message: "Document created with ID: doc-1" },
    ];
    expect(formatSummary(results)).toBe("Document created with ID: doc-1");
  });

  it("returns the error message directly for a single failure", () => {
    const results: UploadResult[] = [
      { fileName: "a.pdf", success: false, message: "Upload failed" },
    ];
    expect(formatSummary(results)).toBe("Upload failed");
  });

  it("formats all-success multi-file summary", () => {
    const results: UploadResult[] = [
      { fileName: "a.pdf", success: true, message: "Added a with ID: 1" },
      { fileName: "b.pdf", success: true, message: "Added b with ID: 2" },
      { fileName: "c.pdf", success: true, message: "Added c with ID: 3" },
    ];
    const summary = formatSummary(results);
    expect(summary).toContain("Uploaded 3/3 files:");
    expect(summary).toContain("✓ Added a with ID: 1");
    expect(summary).toContain("✓ Added b with ID: 2");
    expect(summary).toContain("✓ Added c with ID: 3");
  });

  it("formats all-failure multi-file summary", () => {
    const results: UploadResult[] = [
      { fileName: "a.pdf", success: false, message: "timeout" },
      { fileName: "b.pdf", success: false, message: "not found" },
    ];
    const summary = formatSummary(results);
    expect(summary).toContain("All 2 uploads failed:");
    expect(summary).toContain("✗ a.pdf: timeout");
    expect(summary).toContain("✗ b.pdf: not found");
  });

  it("formats partial-failure multi-file summary", () => {
    const results: UploadResult[] = [
      { fileName: "a.pdf", success: true, message: "Added a with ID: 1" },
      { fileName: "b.pdf", success: false, message: "too large" },
      { fileName: "c.pdf", success: true, message: "Added c with ID: 3" },
    ];
    const summary = formatSummary(results);
    expect(summary).toContain("Uploaded 2/3 files:");
    expect(summary).toContain("✓ Added a with ID: 1");
    expect(summary).toContain("✓ Added c with ID: 3");
    expect(summary).toContain("Failed:");
    expect(summary).toContain("✗ b.pdf: too large");
  });
});
