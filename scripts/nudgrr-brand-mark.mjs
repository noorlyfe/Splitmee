/**
 * Shared Nudgrr brand mark — minimal receipt + gold nudge chevron.
 */

export const BRAND = {
  bg: "#FFF9F0",
  ink: "#1C1917",
  muted: "rgba(111, 101, 87, 0.34)",
  gold: "#FFB800",
  tagline: "#6F6557",
};

/** Receipt card proportions (relative to mark height = 1). */
export const MARK = {
  cardW: 0.72,
  cardH: 1,
  radius: 0.064,
  stroke: 0.009,
  padX: 0.14,
  padTop: 0.16,
  itemStroke: 0.0055,
  itemWidth: 0.72,
  itemYs: [0.34, 0.47, 0.6],
  totalY: 0.78,
  totalStroke: 0.011,
  totalWidth: 0.68,
  chevronGap: 0.05,
  chevronLen: 0.065,
  chevronStroke: 0.011,
};

export function drawBrandMark(ctx, cx, cy, height) {
  const m = MARK;
  const cardW = height * m.cardW;
  const cardH = height;
  const left = cx - cardW / 2;
  const top = cy - cardH / 2;
  const radius = height * m.radius;
  const padX = cardW * m.padX;
  const innerL = left + padX;
  const innerR = left + cardW - padX;
  const innerTop = top + cardH * m.padTop;
  const innerBottom = top + cardH * 0.92;

  roundedRect(ctx, left, top, cardW, cardH, radius);
  ctx.strokeStyle = BRAND.ink;
  ctx.lineWidth = height * m.stroke;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.lineCap = "butt";
  for (const yFrac of m.itemYs) {
    const y = innerTop + (innerBottom - innerTop) * yFrac;
    const lineW = (innerR - innerL) * m.itemWidth;
    ctx.beginPath();
    ctx.moveTo(innerL, y);
    ctx.lineTo(innerL + lineW, y);
    ctx.strokeStyle = BRAND.muted;
    ctx.lineWidth = height * m.itemStroke;
    ctx.stroke();
  }

  const totalY = innerTop + (innerBottom - innerTop) * m.totalY;
  const totalW = (innerR - innerL) * m.totalWidth;
  ctx.beginPath();
  ctx.moveTo(innerL, totalY);
  ctx.lineTo(innerL + totalW, totalY);
  ctx.strokeStyle = BRAND.gold;
  ctx.lineWidth = height * m.totalStroke;
  ctx.lineCap = "round";
  ctx.stroke();

  const tipX = innerL + totalW + cardW * m.chevronGap;
  const arm = height * m.chevronLen;
  const chevronStroke = height * m.chevronStroke;
  ctx.strokeStyle = BRAND.gold;
  ctx.lineWidth = chevronStroke;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(tipX - arm * 0.55, totalY - arm * 0.5);
  ctx.lineTo(tipX, totalY);
  ctx.lineTo(tipX - arm * 0.55, totalY + arm * 0.5);
  ctx.stroke();
}

function roundedRect(ctx, x, y, w, h, r) {
  const right = x + w;
  const bottom = y + h;
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(right - rad, y);
  ctx.arcTo(right, y, right, y + rad, rad);
  ctx.lineTo(right, bottom - rad);
  ctx.arcTo(right, bottom, right - rad, bottom, rad);
  ctx.lineTo(x + rad, bottom);
  ctx.arcTo(x, bottom, x, bottom - rad, rad);
  ctx.lineTo(x, y + rad);
  ctx.arcTo(x, y, x + rad, y, rad);
  ctx.closePath();
}
