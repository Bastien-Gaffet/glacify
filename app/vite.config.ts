import devServer from "@hono/vite-dev-server";
import fs from "fs";
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const __dirname = import.meta.dirname;

// One id per build: the page compares it with /version.json to know an update is out
const BUILD = new Date().toISOString().replace(/\D/g, "").slice(0, 14);

/**
 * Writes /sw.js (offline/sw-template.js with this build's files to keep on
 * the phone) and /version.json at the end of the build.
 */
function offlineShell(): Plugin {
  return {
    name: "glacify-offline-shell",
    apply: "build",
    generateBundle(_, bundle) {
      // Fonts: only the latin subsets (French and English); the others are fetched if ever needed
      const files = Object.keys(bundle).filter(
        (f) => f !== "index.html" && !f.endsWith(".map") && !/(cyrillic|greek|vietnamese|hebrew|math|symbols)/.test(f),
      );
      const publicFiles = ["icon.svg", "mark.svg", "icon-192.png", "icon-512.png", "manifest.webmanifest"];
      const assets = [...files, ...publicFiles].map((f) => `/${f}`);
      const template = fs.readFileSync(path.resolve(__dirname, "offline/sw-template.js"), "utf8");
      this.emitFile({ type: "asset", fileName: "sw.js", source: template.replace('"__BUILD__"', JSON.stringify(BUILD)).replace("__ASSETS__;", `${JSON.stringify(assets)};`) });
      this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ build: BUILD }) });
    },
  };
}

export default defineConfig({
  plugins: [devServer({ entry: "api/boot.ts", exclude: [/^\/(?!api\/).*$/] }), react(), offlineShell()],
  define: {
    __BUILD__: JSON.stringify(BUILD),
  },
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
    },
  },
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    // French and English ship in the main bundle (~510 kB, ~150 kB gzipped);
    // the service animations load apart (ServiceMode)
    chunkSizeWarningLimit: 600,
  },
});
