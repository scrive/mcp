import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");

export default defineConfig({
  root: path.join(here, "get-time"),
  plugins: [viteSingleFile()],
  build: {
    emptyOutDir: false,
    outDir: path.join(root, "dist", "ui", "get-time"),
    rollupOptions: {
      input: path.join(here, "get-time", "app.html"),
    },
  },
});
