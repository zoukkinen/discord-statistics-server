/// <reference types="vitest" />
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { resolve } from "path";

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/frontend-setup.ts"],
    include: ["frontend/**/*.{test,spec}.{js,ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["frontend/src/**/*"],
      exclude: ["frontend/src/**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "frontend/src"),
    },
  },
});
