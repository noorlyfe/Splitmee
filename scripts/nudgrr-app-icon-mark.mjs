/**
 * Splitmee app-icon mark: split disc.
 * Two offset halves of a circle — the bill “split” — bone + electric blue on deep ink.
 * Minimal, modern, reads at 48px. No bar-with-orange-tip gimmick.
 */

export const ICON = {
  bg: "#090B10",
  bgDark: "#06070A",
  bgMid: "#12151C",
  /** Soft paper half */
  bone: "#F4F5F7",
  boneDeep: "#E8EAEE",
  /** Electric navy half */
  mark: "#2F6BFF",
  markDeep: "#1A45C7",
  markBright: "#5B8CFF",
  /** Micro spark in the cleave (accent only) */
  heat: "#FF5C33",
  heatSoft: "rgba(255, 92, 51, 0.45)",
  glow: "rgba(47, 107, 255, 0.32)",
};

/**
 * Split disc: upper bone half + lower blue half, offset along the cleave.
 * `size` is the mark bounding box (not the disc diameter).
 */
export function drawAppIconMark(ctx, cx, cy, size, opts = {}) {
  const bone = opts.inkColor ?? ICON.bone;
  const boneDeep = opts.boneDeep ?? ICON.boneDeep;
  const blue = opts.markColor ?? ICON.mark;
  const blueDeep = opts.markDeep ?? ICON.markDeep;
  const blueBright = opts.markBright ?? ICON.markBright;
  const heat = opts.heatColor ?? ICON.heat;
  const withGlow = opts.withGlow !== false;
  const withSpark = opts.withSpark !== false;

  const R = size * 0.34;
  const gap = size * 0.055;
  const shift = size * 0.055;
  // Cleave angle: NW → SE
  const angle = (-38 * Math.PI) / 180;

  if (withGlow) {
    const g = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R * 1.55);
    g.addColorStop(0, opts.glowColor ?? ICON.glow);
    g.addColorStop(0.55, "rgba(47, 107, 255, 0.1)");
    g.addColorStop(1, "rgba(47, 107, 255, 0)");
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.55, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Soft contact shadow under the disc
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx + size * 0.01, cy + size * 0.04, R * 0.92, R * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Top (bone) half — nudged along cleave normal
  drawHalfDisc(ctx, {
    cx: cx - Math.cos(angle) * shift,
    cy: cy - Math.sin(angle) * shift,
    R,
    angle,
    side: "upper",
    gap,
    fill: (() => {
      const grad = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.2, cy + R * 0.2);
      grad.addColorStop(0, "#FFFFFF");
      grad.addColorStop(1, boneDeep);
      return grad;
    })(),
  });

  // Bottom (blue) half
  drawHalfDisc(ctx, {
    cx: cx + Math.cos(angle) * shift,
    cy: cy + Math.sin(angle) * shift,
    R,
    angle,
    side: "lower",
    gap,
    fill: (() => {
      const grad = ctx.createLinearGradient(cx - R * 0.4, cy - R * 0.2, cx + R, cy + R);
      grad.addColorStop(0, blueBright);
      grad.addColorStop(0.45, blue);
      grad.addColorStop(1, blueDeep);
      return grad;
    })(),
  });

  if (withSpark) {
    const sparkR = size * 0.028;
    const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, sparkR * 4);
    bloom.addColorStop(0, ICON.heatSoft);
    bloom.addColorStop(1, "rgba(255,92,51,0)");
    ctx.beginPath();
    ctx.arc(cx, cy, sparkR * 4, 0, Math.PI * 2);
    ctx.fillStyle = bloom;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, sparkR, 0, Math.PI * 2);
    ctx.fillStyle = heat;
    ctx.fill();
  }
}

/**
 * Half of a circle cut by a diagonal with a gap through the middle.
 * side "upper" = the half toward the negative normal of the cleave.
 */
function drawHalfDisc(ctx, { cx, cy, R, angle, side, gap, fill }) {
  const halfGap = gap / 2;
  // Unit vector along cleave, and perpendicular (pointing to "upper" side)
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const nx = -uy;
  const ny = ux;

  const sign = side === "upper" ? 1 : -1;

  ctx.save();
  ctx.beginPath();
  // Approximate half-disc: full circle clipped by a half-plane inset by gap/2
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Fill only the half beyond the gap plane using a covering rect in clipped space
  // Plane: points where (p - c) · n * sign >= halfGap
  ctx.beginPath();
  // Build a large polygon covering the half-plane
  const span = R * 3;
  const px = cx + nx * sign * halfGap;
  const py = cy + ny * sign * halfGap;
  // Corners along the plane ± along U, then far in normal direction
  const a1x = px - ux * span;
  const a1y = py - uy * span;
  const a2x = px + ux * span;
  const a2y = py + uy * span;
  const b2x = a2x + nx * sign * span;
  const b2y = a2y + ny * sign * span;
  const b1x = a1x + nx * sign * span;
  const b1y = a1y + ny * sign * span;

  ctx.moveTo(a1x, a1y);
  ctx.lineTo(a2x, a2y);
  ctx.lineTo(b2x, b2y);
  ctx.lineTo(b1x, b1y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

/** Full-bleed icon / splash field: quiet depth, not flat void. */
export function fillIconBackground(ctx, size, dark = false) {
  const top = dark ? ICON.bgDark : ICON.bg;
  const mid = ICON.bgMid;
  const g = ctx.createRadialGradient(
    size * 0.5,
    size * 0.42,
    size * 0.04,
    size * 0.5,
    size * 0.5,
    size * 0.75
  );
  g.addColorStop(0, mid);
  g.addColorStop(0.5, top);
  g.addColorStop(1, dark ? "#040506" : "#07080C");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}
