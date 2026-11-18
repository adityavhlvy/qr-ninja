import { defineConfig, loadEnv } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";

// When the app is served through the portfolio at /tools/qr, every asset and
// API call carries this prefix. It stays empty in local dev, so the app runs at
// the root. Set PUBLIC_BASE_PATH=/tools/qr on Vercel.
const { publicVars, rawPublicVars } = loadEnv({ prefixes: ["PUBLIC_"] });
const basePath = (rawPublicVars.PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: { index: "./src/main.tsx" },
    define: publicVars,
  },
  html: {
    template: "./index.html",
    favicon: "./public/favicon.svg",
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
    assetPrefix: basePath ? `${basePath}/` : undefined,
    distPath: { root: "dist" },
    cleanDistPath: true,
  },
});
