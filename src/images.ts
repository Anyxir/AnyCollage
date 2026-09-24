import type { Photo } from "./types";

export const ACCEPT_ATTR =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";

const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"]);

export function isSupportedFile(file: File): boolean {
  if (MIME.has(file.type)) return true;
  const name = file.name.toLowerCase();
  return EXTENSIONS.some((extension) => name.endsWith(extension));
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("unsupported"));
    image.src = url;
  });
}

function browserCanShow(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg" || type === "image/png" || type === "image/webp") return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp");
}

async function blobUrlFromCanvas(canvas: HTMLCanvasElement, quality: number): Promise<string> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
  if (!blob) throw new Error("thumbnail");
  return URL.createObjectURL(blob);
}

async function jpegUrlFromSource(source: CanvasImageSource, width: number, height: number, quality: number): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return blobUrlFromCanvas(canvas, quality);
}

async function thumbnailFromSource(
  source: CanvasImageSource,
  width: number,
  height: number,
): Promise<string> {
  const maxEdge = 320;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, targetW, targetH);
  context.drawImage(source, 0, 0, targetW, targetH);
  return blobUrlFromCanvas(canvas, 0.82);
}

async function displayUrl(file: File, originalUrl: string, source: CanvasImageSource, width: number, height: number): Promise<string> {
  if (browserCanShow(file)) return originalUrl;
  const converted = await jpegUrlFromSource(source, width, height, 0.92);
  URL.revokeObjectURL(originalUrl);
  return converted;
}

export async function createPhoto(file: File): Promise<Photo> {
  const url = URL.createObjectURL(file);
  try {
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        try {
          const [thumbUrl, display] = await Promise.all([
            thumbnailFromSource(bitmap, bitmap.width, bitmap.height),
            displayUrl(file, url, bitmap, bitmap.width, bitmap.height),
          ]);
          return {
            id: uid(),
            name: file.name,
            url: display,
            thumbUrl,
            width: bitmap.width,
            height: bitmap.height,
          };
        } finally {
          bitmap.close();
        }
      } catch {
        // Fall through to HTMLImageElement for formats the bitmap decoder rejects.
      }
    }

    const image = await loadImage(url);
    const thumbUrl = await thumbnailFromSource(image, image.naturalWidth, image.naturalHeight);
    const display = await displayUrl(file, url, image, image.naturalWidth, image.naturalHeight);
    return {
      id: uid(),
      name: file.name,
      url: display,
      thumbUrl,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export function revokePhoto(photo: Photo): void {
  URL.revokeObjectURL(photo.url);
  if (photo.thumbUrl.startsWith("blob:")) {
    URL.revokeObjectURL(photo.thumbUrl);
  }
}

export function preloadImage(url: string): void {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
}
