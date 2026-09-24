import { jsPDF } from "jspdf";
import {
  BORDER_MM,
  RADIUS_MM,
  borderColorFor,
  containDest,
  coverSource,
  pageSize,
  parseHex,
} from "./geometry";
import { separatedSheets } from "./layout";
import type { GridDefinition, Photo, PhotoGroup, SheetSettings, TitleSettings } from "./types";

const DPI = 200;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image"));
    image.src = url;
  });
}

async function loadPhoto(photo: Photo): Promise<HTMLImageElement> {
  try {
    return await loadImage(photo.url);
  } catch {
    return loadImage(photo.thumbUrl);
  }
}

function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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

function drawTitle(
  context: CanvasRenderingContext2D,
  pageWidth: number,
  topMm: number,
  title: TitleSettings,
  name: string,
  ppm: number,
  color: string,
): void {
  const size = title.sizeMm * ppm;
  context.fillStyle = color;
  context.font = `${title.weight} ${size}px "Plus Jakarta Sans", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText(name, (pageWidth * ppm) / 2, topMm * ppm, pageWidth * ppm * 0.9);
}

async function renderPage(
  placed: ReturnType<typeof separatedSheets<Photo>>[number],
  settings: SheetSettings,
  title: TitleSettings,
): Promise<string> {
  const page = pageSize(settings.orientation);
  const ppm = DPI / 25.4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(page.width * ppm));
  canvas.height = Math.max(1, Math.round(page.height * ppm));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponible");

  const { r, g, b } = parseHex(settings.background);
  context.fillStyle = `rgb(${r}, ${g}, ${b})`;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const color = borderColorFor(settings.background);
  for (const item of placed.titles) {
    drawTitle(context, page.width, item.top, { ...title, offsetMm: 0 }, item.name, ppm, color);
  }

  for (const cell of placed.cells) {
    const image = await loadPhoto(cell.photo);
    drawCell(context, image, cell, ppm, settings);
  }

  context.fillStyle = color;
  context.font = `600 ${3.2 * ppm}px "Plus Jakarta Sans", sans-serif`;
  context.textAlign = "right";
  context.textBaseline = "bottom";
  context.globalAlpha = 0.72;
  context.fillText(String(placed.pageIndex + 1), page.width * ppm - 4 * ppm, page.height * ppm - 3 * ppm);
  context.globalAlpha = 1;

  const data = canvas.toDataURL("image/jpeg", 0.92);
  canvas.width = 0;
  canvas.height = 0;
  return data;
}

export async function exportCollagePdf(options: {
  groups: PhotoGroup[];
  grid: GridDefinition;
  settings: SheetSettings;
  title: TitleSettings;
  onProgress?: (page: number, total: number) => void;
}): Promise<void> {
  const { groups, grid, settings, title, onProgress } = options;
  const pages = separatedSheets(groups, grid, settings, title);
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

  onProgress?.(0, pages.length);
  await new Promise((resolve) => window.setTimeout(resolve, 0));

  for (let index = 0; index < pages.length; index += 1) {
    onProgress?.(index + 1, pages.length);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    const sheet = pages[index];
    if (!sheet) continue;
    const image = await renderPage(sheet, settings, title);
    if (index > 0) doc.addPage("a4", orientation);
    const page = pageSize(settings.orientation);
    doc.addImage(image, "JPEG", 0, 0, page.width, page.height, undefined, "SLOW");
  }

  downloadPdf(doc.output("blob"), "anycollage-a4.pdf");
}
