import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android shell. The app loads the live site (server.url), so every web
 * deploy reaches installed APKs without a new release. The APK itself is
 * built by GitHub Actions (.github/workflows/android.yml), never locally.
 *
 * appId is permanent once published on Google Play.
 */
const config: CapacitorConfig = {
  appId: "app.glacify.android",
  appName: "Glacify",
  webDir: "dist/public",
  server: {
    url: "https://glacify.bastiengaffet.fr",
    cleartext: false,
  },
  backgroundColor: "#ffffff",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    // Android 15+ draws the app under the status and navigation bars: expose
    // their heights to the page as --safe-area-inset-* (used in index.css)
    SystemBars: { insetsHandling: "css", initialViewportFitValueHint: "cover" },
  },
};

export default config;
