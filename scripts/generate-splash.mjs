/**
 * Native splash assets: deep field + Splitmee mark with glow + heat tip.
 * Run: node scripts/generate-splash.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import { ICON, drawAppIconMark, fillIconBackground } from "./nudgrr-app-icon-mark.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function splashLogoPng(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  fillIconBackground(ctx, size, false);
  drawAppIconMark(ctx, size / 2, size / 2, size * 0.78, {
    withGlow: false,
    withSpark: true,
  });
  return canvas.toBuffer("image/png");
}

async function writeSplashLogo() {
  const logoSize = 840;
  const buf = splashLogoPng(logoSize);
  const out = path.join(root, "assets", "splash-logo.png");
  fs.writeFileSync(out, buf);
  console.log("Wrote", out, `(${logoSize}×${logoSize})`);

  const iosDir = path.join(
    root,
    "ios",
    "Nudgrr",
    "Images.xcassets",
    "SplashScreenLogo.imageset"
  );
  const iosTargets = [
    ["image.png", 280],
    ["image@2x.png", 560],
    ["image@3x.png", 840],
  ];
  for (const [name, size] of iosTargets) {
    const resized = await sharp(buf).resize(size, size).png().toBuffer();
    const dest = path.join(iosDir, name);
    fs.writeFileSync(dest, resized);
    console.log("Wrote", dest);
  }

  const androidSizes = [
    ["drawable-mdpi", 288],
    ["drawable-hdpi", 432],
    ["drawable-xhdpi", 576],
    ["drawable-xxhdpi", 864],
    ["drawable-xxxhdpi", 1152],
  ];
  for (const [folder, size] of androidSizes) {
    const resized = await sharp(buf).resize(size, size).png().toBuffer();
    const dest = path.join(
      root,
      "android",
      "app",
      "src",
      "main",
      "res",
      folder,
      "splashscreen_logo.png"
    );
    fs.writeFileSync(dest, resized);
    console.log("Wrote", dest);
  }

  const androidOut = path.join(root, "assets", "splash-android.png");
  fs.writeFileSync(androidOut, buf);
  console.log("Wrote", androidOut);
}

function writeFullSplash() {
  const W = 1242;
  const H = 2688;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Tall radial field: lit center behind mark, deep edges
  const g = ctx.createRadialGradient(W * 0.5, H * 0.4, H * 0.02, W * 0.5, H * 0.42, H * 0.55);
  g.addColorStop(0, ICON.bgMid);
  g.addColorStop(0.4, ICON.bg);
  g.addColorStop(1, "#06070A");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  drawAppIconMark(ctx, W / 2, H * 0.4, Math.min(W, H) * 0.38, {
    withGlow: false,
    withSpark: true,
  });
  const out = path.join(root, "assets", "splash.png");
  fs.writeFileSync(out, canvas.toBuffer("image/png"));
  console.log("Wrote", out, `(${W}×${H})`);
}

async function main() {
  writeFullSplash();
  await writeSplashLogo();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
