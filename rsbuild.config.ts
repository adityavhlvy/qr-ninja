import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

// The API and the redirect live in /api and only run under `vercel dev`.
// During local frontend work they proxy to a second terminal on port 3001.
export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: { index: "./src/main.tsx" },
  },
  html: {
    template: "./index.html",
  },
  server: {
    port: 3000,
    historyApiFallback: true,
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
      "/q": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
  output: {
    distPath: { root: "dist" },
    cleanDistPath: true,
  },
});
