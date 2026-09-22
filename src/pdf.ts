import { jsPDF } from "jspdf";
import {
  BORDER_MM,
  RADIUS_MM,
  borderColorFor,
  containDest,
  coverSource,
  parseHex,
  sheetLayout,
} from "./geometry";
import { allPageSlots } from "./layout";
import type { GridDefinition, Photo, SheetSettings } from "./types";

const DPI = 200;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image"));
    image.src = url;
  });
}

function roundRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function drawCell(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  cell: { x: number; y: number; w: number; h: number },
  ppm: number,
  settings: SheetSettings,
): void {
  const x = cell.x * ppm;
  const y = cell.y * ppm;
  const w = cell.w * ppm;
  const h = cell.h * ppm;
  const border = BORDER_MM[settings.border] * ppm;
  const radius = RADIUS_MM[settings.radius] * ppm;
  const innerX = x + border;
  const innerY = y + border;
  const innerW = Math.max(1, w - border * 2);
  const innerH = Math.max(1, h - border * 2);

  context.save();
  roundRectPath(context, innerX, innerY, innerW, innerH, Math.max(0, radius - border));
  context.clip();
  context.fillStyle = settings.background;
  context.fillRect(innerX, innerY, innerW, innerH);

  if (settings.fit === "contain") {
    const dest = containDest(image.naturalWidth, image.naturalHeight, innerW, innerH);
    context.drawImage(image, innerX + dest.x, innerY + dest.y, dest.w, dest.h);
  } else {
    const source = coverSource(image.naturalWidth, image.naturalHeight, innerW, innerH);
    context.drawImage(
      image,
      source.sx,
      source.sy,
      source.sw,
      source.sh,
      innerX,
      innerY,
      innerW,
      innerH,
    );
  }
  context.restore();

  if (border > 0) {
    context.save();
    const inset = border / 2;
    roundRectPath(context, x + inset, y + inset, w - border, h - border, Math.max(0, radius - inset));
    context.strokeStyle = borderColorFor(settings.background);
    context.lineWidth = border;
    context.stroke();
    context.restore();
  }
}

async function renderPage(
  slots: (Photo | null)[],
  grid: GridDefinition,
  settings: SheetSettings,
): Promise<string> {
  const { page, cells } = sheetLayout(grid, settings);
  const ppm = DPI / 25.4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(page.width * ppm));
  canvas.height = Math.max(1, Math.round(page.height * ppm));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponible");

  const { r, g, b } = parseHex(settings.background);
  context.fillStyle = `rgb(${r}, ${g}, ${b})`;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < cells.length; index += 1) {
    const photo = slots[index];
    const cell = cells[index];
    if (!photo || !cell) continue;
    const image = await loadImage(photo.url);
    drawCell(context, image, cell, ppm, settings);
  }

  const data = canvas.toDataURL("image/jpeg", 0.92);
  canvas.width = 0;
  canvas.height = 0;
  return data;
}

export async function exportCollagePdf(options: {
  photos: Photo[];
  grid: GridDefinition;
  settings: SheetSettings;
  onProgress?: (page: number, total: number) => void;
}): Promise<void> {
  const { photos, grid, settings, onProgress } = options;
  const capacity = grid.rows * grid.columns;
  const pages = allPageSlots(photos, capacity);
  const orientation = settings.orientation === "landscape" ? "landscape" : "portrait";
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
    compress: true,
  });
  doc.setProperties({
    title: "AnyCollage",
    creator: "AnyCollage",
  });

  for (let index = 0; index < pages.length; index += 1) {
    onProgress?.(index + 1, pages.length);
    const slots = pages[index] ?? [];
    const image = await renderPage(slots, grid, settings);
    if (index > 0) doc.addPage("a4", orientation);
    const { page } = sheetLayout(grid, settings);
    doc.addImage(image, "JPEG", 0, 0, page.width, page.height, undefined, "SLOW");
  }

  doc.save("anycollage-a4.pdf");
}
