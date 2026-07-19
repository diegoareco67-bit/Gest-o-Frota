import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const isPlaywrightTest = process.env.PLAYWRIGHT_TEST === "1";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: isPlaywrightTest
      ? {
          "firebase/auth":      resolve(__dirname, "src/firebase/__mocks__/auth.ts"),
          "firebase/firestore": resolve(__dirname, "src/firebase/__mocks__/firestore.ts"),
        }
      : {},
  },
});
