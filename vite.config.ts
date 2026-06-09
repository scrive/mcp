import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import pkg from "./package.json" with { type: "json" };

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
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
      external: [/^node:/, /^@modelcontextprotocol/, /^@napi-rs\//, "express", "zod"],
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
  test: {
    unstubEnvs: true,
    alias: {
      "#ui": path.join(here, "src", "ui"),
    },
  },
});
