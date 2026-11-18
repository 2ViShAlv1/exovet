import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The API (api/server.py) runs on port 8000; in development Vite forwards /api to it.
const API_TARGET = process.env.EXOVET_API ?? "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: API_TARGET, changeOrigin: true } },
  },
  preview: {
    port: 4173,
    proxy: { "/api": { target: API_TARGET, changeOrigin: true } },
  },
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Only libraries every page needs get manual chunks. three.js and recharts are left to their
        // lazy imports (PlanetHero, Predict/Results): listing them here would make Vite preload them
        // on first paint, because Rollup would move shared helpers into those chunks.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
        },
      },
    },
  },
});
