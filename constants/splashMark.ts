/** Ascending nudge mark — shared with app icon geometry. */
export const SPLASH_BG = "#FFF9F0";
export const SPLASH_MARK = "#FFB800";

export const MARK_STEPS = [
  { s: 0.2, t: 0.78 },
  { s: 0.27, t: 0.52 },
  { s: 0.36, t: 0.22 },
] as const;

export type MarkSquareLayout = {
  left: number;
  top: number;
  size: number;
  radius: number;
};

/** Positions for each square relative to a mark bounding box (width × height). */
export function getMarkSquareLayouts(markSize: number): MarkSquareLayout[] {
  const span = markSize * 0.92;
  const cx = markSize / 2;
  const cy = markSize / 2;
  const startX = cx - span * 0.34;
  const startY = cy + span * 0.3;
  const endX = cx + span * 0.34;
  const endY = cy - span * 0.3;

  return MARK_STEPS.map((step) => {
    const side = markSize * step.s;
    return {
      left: startX + (endX - startX) * step.t - side / 2,
      top: startY + (endY - startY) * step.t - side / 2,
      size: side,
      radius: side * 0.28,
    };
  });
}
