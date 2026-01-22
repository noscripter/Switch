import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(() => {
  const target = process.env.EXT_TARGET || "mv3";
  const root = path.resolve(__dirname, "src");
  return {
    root,
    plugins: [react()],
    base: "./",
    publicDir: path.resolve(__dirname, "public"),
    build: {
      outDir: path.resolve(__dirname, "dist", target),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: path.resolve(root, "popup/index.html"),
        },
      },
    },
  };
});
