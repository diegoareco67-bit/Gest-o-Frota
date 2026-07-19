import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^firebase\/auth$/,      replacement: resolve(__dirname, "src/firebase/__mocks__/auth.ts") },
      { find: /^firebase\/firestore$/, replacement: resolve(__dirname, "src/firebase/__mocks__/firestore.ts") },
    ],
  },
});
