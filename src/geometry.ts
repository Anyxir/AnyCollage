import type { BorderStyle, Orientation, RadiusStyle } from "./types";

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export const BORDER_MM: Record<BorderStyle, number> = {
  none: 0,
  thin: 0.35,
  medium: 0.9,
  thick: 1.8,
};

export const RADIUS_MM: Record<RadiusStyle, number> = {
  square: 0,
  slight: 1.6,
  round: 3.5,
};

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type PageSize = {
  width: number;
  height: number;
};

const roundMm = (value: number) => Math.round(value * 1000) / 1000;

export function pageSize(orientation: Orientation): PageSize {
  if (orientation === "landscape") {
    return { width: A4_HEIGHT_MM, height: A4_WIDTH_MM };
  }
  return { width: A4_WIDTH_MM, height: A4_HEIGHT_MM };
}

export function parseHex(hex: string): { r: number; g: number; b: number } {
  const raw = hex.trim().replace("#", "");
  const value =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;
  const int = Number.parseInt(value, 16);
  if (!Number.isFinite(int) || value.length !== 6) {
    return { r: 255, g: 255, b: 255 };
  }
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function borderColorFor(background: string): string {
  return relativeLuminance(background) > 0.62 ? "#1c1915" : "#f4f1ea";
}

export function normalizeHex(value: string): string {
  const next = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(next)) return next;
  return "#ffffff";
}

export function clampMargin(value: number): number {
  if (!Number.isFinite(value)) return 5;
  return Math.min(40, Math.max(0, value));
}

export function clampGap(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(20, Math.max(0, value));
}

function fits(
  pageW: number,
  pageH: number,
  rows: number,
  columns: number,
  margin: number,
  gap: number,
  minCell: number,
): boolean {
  const innerW = pageW - margin * 2;
  const innerH = pageH - margin * 2;
  if (innerW <= 0 || innerH <= 0) return false;
  const cellW = (innerW - gap * Math.max(0, columns - 1)) / columns;
  const cellH = (innerH - gap * Math.max(0, rows - 1)) / rows;
  return cellW >= minCell && cellH >= minCell;
}

export function effectiveSpacing(options: {
  pageW: number;
  pageH: number;
  rows: number;
  columns: number;
  margin: number;
  gap: number;
}): { margin: number; gap: number } {
  let margin = clampMargin(options.margin);
  let gap = clampGap(options.gap);
  const minCell = 2;
  for (let step = 0; step < 120 && !fits(options.pageW, options.pageH, options.rows, options.columns, margin, gap, minCell); step += 1) {
    if (gap > 0) gap = Math.max(0, Math.round((gap - 0.5) * 1000) / 1000);
    else if (margin > 0) margin = Math.max(0, Math.round((margin - 0.5) * 1000) / 1000);
    else break;
  }
  return { margin, gap };
}

export function layoutCells(options: {
  pageW: number;
  pageH: number;
  rows: number;
  columns: number;
  margin: number;
  gap: number;
}): Rect[] {
  const { pageW, pageH, rows, columns, margin, gap } = options;
  const innerW = pageW - margin * 2;
  const innerH = pageH - margin * 2;
  const cellW = (innerW - gap * Math.max(0, columns - 1)) / columns;
  const cellH = (innerH - gap * Math.max(0, rows - 1)) / rows;
  const cells: Rect[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      cells.push({
        x: roundMm(margin + column * (cellW + gap)),
        y: roundMm(margin + row * (cellH + gap)),
        w: roundMm(cellW),
        h: roundMm(cellH),
      });
    }
  }
  return cells;
}

export function sheetLayout(
  grid: { rows: number; columns: number },
  settings: { orientation: Orientation; marginMm: number; gapMm: number },
): { page: PageSize; space: { margin: number; gap: number }; cells: Rect[] } {
  const page = pageSize(settings.orientation);
  const space = effectiveSpacing({
    pageW: page.width,
    pageH: page.height,
    rows: grid.rows,
    columns: grid.columns,
    margin: settings.marginMm,
    gap: settings.gapMm,
  });
  const cells = layoutCells({
    pageW: page.width,
    pageH: page.height,
    rows: grid.rows,
    columns: grid.columns,
    margin: space.margin,
    gap: space.gap,
  });
  return { page, space, cells };
}

/** Source rectangle that fills the box without distortion (object-fit: cover). */
export function coverSource(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const scale = Math.max(boxW / imgW, boxH / imgH);
  const sw = boxW / scale;
  const sh = boxH / scale;
  return {
    sx: (imgW - sw) / 2,
    sy: (imgH - sh) / 2,
    sw,
    sh,
  };
}

/** Destination rectangle that shows the whole image (object-fit: contain). */
export function containDest(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
): { x: number; y: number; w: number; h: number } {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return {
    x: (boxW - w) / 2,
    y: (boxH - h) / 2,
    w,
    h,
  };
}
