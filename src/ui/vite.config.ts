import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..");

const app = process.env.UI_APP ?? "file-upload";

export default defineConfig({
  root: path.join(here, app),
  plugins: [viteSingleFile()],
  build: {
    emptyOutDir: false,
    outDir: path.join(root, "dist", "ui", app),
    rollupOptions: {
      input: path.join(here, app, "app.html"),
    },
  },
});
