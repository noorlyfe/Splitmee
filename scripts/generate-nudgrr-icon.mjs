/**
 * Renders the Nudgrr app icon (1024×1024) — cream field, bold nudge glyph.
 * Run: node scripts/generate-nudgrr-icon.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import { ICON, drawAppIconMark } from "./nudgrr-app-icon-mark.mjs";

const SIZE = 1024;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function renderIcon(size = SIZE) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = ICON.bg;
  ctx.fillRect(0, 0, size, size);

  const markSize = size * 0.84;
  drawAppIconMark(ctx, size / 2, size / 2, markSize);

  return canvas.toBuffer("image/png");
}

/** Android adaptive safe zone — glyph scaled for ~66% safe area. */
function renderAdaptiveForeground(size = SIZE) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, size, size);

  const markSize = size * 0.72;
  drawAppIconMark(ctx, size / 2, size / 2, markSize);

  return canvas.toBuffer("image/png");
}

const ANDROID_SIZES = [
  ["mipmap-mdpi", 48],
  ["mipmap-hdpi", 72],
  ["mipmap-xhdpi", 96],
  ["mipmap-xxhdpi", 144],
  ["mipmap-xxxhdpi", 192],
];

async function flattenIcon(png) {
  return sharp(png)
    .flatten({ background: { r: 0xff, g: 0xf9, b: 0xf0 } })
    .png()
    .toBuffer();
}

async function syncNativeIcons(png) {
  const iosIconDir = path.join(root, "ios", "Nudgrr", "Images.xcassets", "AppIcon.appiconset");
  const iosLight = path.join(iosIconDir, "App-Icon-1024x1024@1x.png");
  const iosDark = path.join(iosIconDir, "App-Icon-dark-1024x1024@1x.png");

  fs.writeFileSync(iosLight, png);
  fs.writeFileSync(iosDark, png);
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
  const adaptiveFg = await renderAdaptiveForeground();
  const adaptivePadded = await sharp(adaptiveFg)
    .flatten({ background: { r: 0xff, g: 0xf9, b: 0xf0, alpha: 0 } })
    .png()
    .toBuffer();

  fs.mkdirSync(path.join(root, "assets", "images"), { recursive: true });

  const targets = [
    path.join(root, "assets", "images", "icon.png"),
    path.join(root, "assets", "adaptive-icon.png"),
    path.join(root, "assets", "icon.png"),
    path.join(root, "assets", "icon-dark.png"),
    path.join(root, "assets", "nudgrr-icon-1024.png"),
    path.join(root, "assets", "adaptive-icon-padded.png"),
  ];

  for (const dest of targets) {
    const buf = dest.endsWith("adaptive-icon-padded.png") ? adaptivePadded : png;
    fs.writeFileSync(dest, buf);
    console.log("Wrote", dest);
  }

  await syncNativeIcons(png);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
