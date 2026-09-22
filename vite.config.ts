import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ["**/*.tmp", "**/*~tmp", "**/*.png.~*", "**/build/**", "**/release/**"],
    },
  },
  test: {
    environment: "node",
  },
});
