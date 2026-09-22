/**
 * Renders the Splitmee app icon (1024×1024): void field, acid split mark.
 * Run: node scripts/generate-nudgrr-icon.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import { ICON, drawAppIconMark, fillIconBackground } from "./nudgrr-app-icon-mark.mjs";

const SIZE = 1024;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function renderIcon(size = SIZE, dark = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  fillIconBackground(ctx, size, dark);

  const markSize = size * 0.92;
  drawAppIconMark(ctx, size / 2, size / 2, markSize, {
    withGlow: true,
    withSpark: true,
  });

  return canvas.toBuffer("image/png");
}

/** Android adaptive safe zone: glyph scaled for ~66% safe area. */
function renderAdaptiveForeground(size = SIZE) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, size, size);

  const markSize = size * 0.78;
  drawAppIconMark(ctx, size / 2, size / 2, markSize, {
    withGlow: true,
    withSpark: true,
  });

  return canvas.toBuffer("image/png");
}

/** Transparent mark only (animated splash glyph). */
function renderMarkOnly(size = SIZE) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  drawAppIconMark(ctx, size / 2, size / 2, size * 0.92, {
    withGlow: false,
    withSpark: true,
  });
  return canvas.toBuffer("image/png");
}

const ANDROID_SIZES = [
  ["mipmap-mdpi", 48],
  ["mipmap-hdpi", 72],
  ["mipmap-xhdpi", 96],
  ["mipmap-xxhdpi", 144],
  ["mipmap-xxxhdpi", 192],
];

async function flattenIcon(png, dark = false) {
  const bg = dark
    ? { r: 0x06, g: 0x07, b: 0x0a }
    : { r: 0x09, g: 0x0b, b: 0x10 };
  return sharp(png).flatten({ background: bg }).png().toBuffer();
}

async function syncNativeIcons(png, pngDark = png) {
  const iosIconDir = path.join(root, "ios", "Nudgrr", "Images.xcassets", "AppIcon.appiconset");
  const iosLight = path.join(iosIconDir, "App-Icon-1024x1024@1x.png");
  const iosDark = path.join(iosIconDir, "App-Icon-dark-1024x1024@1x.png");

  fs.writeFileSync(iosLight, png);
  fs.writeFileSync(iosDark, pngDark);
  console.log("Wrote", iosLight);
  console.log("Wrote", iosDark);

  for (const [folder, size] of ANDROID_SIZES) {
    const dir = path.join(root, "android", "app", "src", "main", "res", folder);
    const webp = await sharp(png).resize(size, size).webp({ quality: 92 }).toBuffer();
    for (const name of ["ic_launcher.webp", "ic_launcher_round.webp"]) {
      const dest = path.join(dir, name);
      fs.writeFileSync(dest, webp);
      console.log("Wrote", dest);
    }
  }
}

async function main() {
  const png = await flattenIcon(renderIcon());
  const pngDark = await flattenIcon(renderIcon(SIZE, true), true);
  const adaptiveFg = await renderAdaptiveForeground();
  const adaptivePadded = await sharp(adaptiveFg)
    .ensureAlpha()
    .png()
    .toBuffer();

  fs.mkdirSync(path.join(root, "assets", "images"), { recursive: true });

  const lightTargets = [
    path.join(root, "assets", "images", "icon.png"),
    path.join(root, "assets", "adaptive-icon.png"),
    path.join(root, "assets", "icon.png"),
    path.join(root, "assets", "nudgrr-icon-1024.png"),
  ];

  for (const dest of lightTargets) {
    fs.writeFileSync(dest, png);
    console.log("Wrote", dest);
  }
  fs.writeFileSync(path.join(root, "assets", "icon-dark.png"), pngDark);
  console.log("Wrote", path.join(root, "assets", "icon-dark.png"));
  fs.writeFileSync(path.join(root, "assets", "adaptive-icon-padded.png"), adaptivePadded);
  console.log("Wrote", path.join(root, "assets", "adaptive-icon-padded.png"));

  const markOnly = renderMarkOnly();
  fs.writeFileSync(path.join(root, "assets", "splash-mark.png"), markOnly);
  console.log("Wrote", path.join(root, "assets", "splash-mark.png"));

  await syncNativeIcons(png, pngDark);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
