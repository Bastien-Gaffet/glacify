// Renders the PNG icons (web and Android) from the SVGs of this folder.
// Run from app/: node marketing/logo/render.cjs  (needs Playwright with Chromium)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const here = __dirname;
const app = path.resolve(here, "../..");
const svg = (name) => fs.readFileSync(path.join(here, name), "utf8");
const BG = "#D9416A";
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  async function render(markup, size, out, { round = false, background = null } = {}) {
    const radius = round ? "50%" : "0";
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;border-radius:${radius};overflow:hidden;background:${background ?? "transparent"}">${markup.replace("<svg ", `<svg width="${size}" height="${size}" `)}</div></body></html>`,
    );
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out, omitBackground: true });
  }
  const icon = svg("icon.svg");
  const fg = svg("foreground.svg");
  await render(icon, 192, path.join(app, "public/icon-192.png"));
  await render(icon, 512, path.join(app, "public/icon-512.png"));
  await render(icon, 512, path.join(here, "preview-512.png"));
  for (const [d, k] of Object.entries(DENSITIES)) {
    const dir = path.join(app, `android-res/mipmap-${d}`);
    await render(fg, Math.round(108 * k), path.join(dir, "ic_launcher_foreground.png"));
    await render(fg, Math.round(48 * k), path.join(dir, "ic_launcher.png"), { background: BG });
    await render(fg, Math.round(48 * k), path.join(dir, "ic_launcher_round.png"), { background: BG, round: true });
  }
  await render(fg, 288, path.join(app, "android-res/drawable/splash_mark.png"));
  await browser.close();
  console.log("icons rendered");
})();
