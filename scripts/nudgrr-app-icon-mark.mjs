/**
 * Premium app-icon glyph — modern abstract mark, single flat color.
 * Icon only; splash keeps nudgrr-brand-mark.mjs.
 */

export const ICON = {
  bg: "#FFF9F0",
  mark: "#FFB800",
};

/**
 * Ascending nudge mark — three rounded squares stepping forward.
 * Momentum / gentle push. Flat charcoal, no gold, no letterforms.
 */
export function drawAppIconMark(ctx, cx, cy, size) {
  const steps = [
    { s: 0.2, t: 0.78 },
    { s: 0.27, t: 0.52 },
    { s: 0.36, t: 0.22 },
  ];

  const span = size * 0.92;
  const startX = cx - span * 0.34;
  const startY = cy + span * 0.3;
  const endX = cx + span * 0.34;
  const endY = cy - span * 0.3;

  for (const step of steps) {
    const side = size * step.s;
    const x = startX + (endX - startX) * step.t - side / 2;
    const y = startY + (endY - startY) * step.t - side / 2;
    const r = side * 0.28;
    fillRoundedRect(ctx, x, y, side, side, r, ICON.mark);
  }
}

function fillRoundedRect(ctx, x, y, w, h, r, fill) {
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
  ctx.fillStyle = fill;
  ctx.fill();
}
