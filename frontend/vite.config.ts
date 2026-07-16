import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const bffUrl = process.env.VITE_BFF_URL ?? "http://127.0.0.1:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": bffUrl,
      "/auth": bffUrl,
      "/health": bffUrl,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
});
