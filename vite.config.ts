import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The web personalization tool (app/). Kept separate from Remotion's own
// bundler (used only for Studio/rendering). `publicDir` points at the same
// public/ folder Remotion uses, so staticFile("font/...") etc. resolve the
// same way here as they do in Studio/renders.
export default defineConfig({
  plugins: [react()],
  root: "app",
  publicDir: "../public",
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  build: {
    outDir: "../app-dist",
    emptyOutDir: true,
  },
});
