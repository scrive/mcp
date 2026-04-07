import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    target: "es2024",
    lib: {
      entry: "./src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [/^node:/, /^@modelcontextprotocol/, "express", "zod"],
      output: {
        banner: "#!/usr/bin/env node",
      },
    },
  },
  resolve: {
    alias: {
      "#ui": path.join(here, "dist", "ui"),
    },
  },
});
