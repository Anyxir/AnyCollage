import { effectiveSpacing, pageSize } from "./geometry";
import type { Orientation } from "./types";

export function pageCountFor(photoCount: number, capacity: number): number {
  if (capacity <= 0) return 1;
  if (photoCount <= 0) return 1;
  return Math.ceil(photoCount / capacity);
}

export function pageSlots<T>(items: T[], pageIndex: number, capacity: number): (T | null)[] {
  const start = pageIndex * capacity;
  const slots: (T | null)[] = [];
  for (let index = 0; index < capacity; index += 1) {
    slots.push(items[start + index] ?? null);
  }
  return slots;
}

export function allPageSlots<T>(items: T[], capacity: number): (T | null)[][] {
  const count = pageCountFor(items.length, capacity);
  return Array.from({ length: count }, (_, page) => pageSlots(items, page, capacity));
}

export function arrayMove<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = items.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return items;
  next.splice(to, 0, item);
  return next;
}

export function swapItems<T>(items: T[], a: number, b: number): T[] {
  if (a === b || a < 0 || b < 0 || a >= items.length || b >= items.length) return items;
  const next = items.slice();
  const left = next[a];
  const right = next[b];
  if (left === undefined || right === undefined) return items;
  next[a] = right;
  next[b] = left;
  return next;
}

export function moveToEnd<T>(items: T[], from: number): T[] {
  if (from < 0 || from >= items.length) return items;
  return arrayMove(items, from, items.length - 1);
}

export function insertAt<T>(items: T[], index: number, incoming: T[]): T[] {
  if (incoming.length === 0) return items;
  const next = items.slice();
  const at = Math.max(0, Math.min(index, next.length));
  next.splice(at, 0, ...incoming);
  return next;
}

export type GroupSheet<T> = {
  groupId: string;
  groupName: string;
  pageIndex: number;
  pageCount: number;
  slots: (T | null)[];
};

export function groupSheets<T>(
  groups: { id: string; name: string; photos: T[] }[],
  capacity: number,
): GroupSheet<T>[] {
  const ordered = groups.flatMap((group) => group.photos.map((photo) => ({ photo, group })));
  const pages = allPageSlots(ordered, capacity);
  return pages.map((page, pageIndex) => {
    const names: string[] = [];
    for (const entry of page) {
      if (entry && !names.includes(entry.group.name)) names.push(entry.group.name);
    }
    const group = page.find((entry) => entry !== null)?.group ?? groups[0];
    return {
      groupId: group?.id ?? "",
      groupName: names.join(" · ") || group?.name || "",
      pageIndex,
      pageCount: pages.length,
      slots: page.map((entry) => entry?.photo ?? null),
    };
  });
}

export type PlacedTitle = { name: string; top: number };
export type PlacedCell<T> = { photo: T; x: number; y: number; w: number; h: number };
export type SeparatedPage<T> = {
  pageIndex: number;
  pageCount: number;
  titles: PlacedTitle[];
  cells: PlacedCell<T>[];
};

const roundMm = (value: number) => Math.round(value * 1000) / 1000;

export function separatedSheets<T>(
  groups: { id: string; name: string; photos: T[] }[],
  grid: { rows: number; columns: number },
  settings: { orientation: Orientation; marginMm: number; gapMm: number },
  title: { sizeMm: number; offsetMm: number; gapMm: number },
): SeparatedPage<T>[] {
  const page = pageSize(settings.orientation);
  const space = effectiveSpacing({
    pageW: page.width,
    pageH: page.height,
    rows: grid.rows,
    columns: grid.columns,
    margin: settings.marginMm,
    gap: settings.gapMm,
  });
  const columns = Math.max(1, grid.columns);
  const innerW = page.width - space.margin * 2;
  const innerH = page.height - space.margin * 2;
  const cellW = (innerW - space.gap * (columns - 1)) / columns;
  const titleH = title.sizeMm * 1.15 + title.gapMm;
  const bottom = page.height - space.margin;
  const freshTop = space.margin + title.offsetMm;
  const gridCellH = (innerH - space.gap * Math.max(0, grid.rows - 1)) / Math.max(1, grid.rows);
  const cellH = Math.min(gridCellH, Math.max(8, bottom - freshTop - titleH));
  const pages: SeparatedPage<T>[] = [];
  let titles: PlacedTitle[] = [];
  let cells: PlacedCell<T>[] = [];
  let y = freshTop;
  const fits = (height: number) => y + height <= bottom + 0.05;

  const flush = () => {
    if (titles.length === 0 && cells.length === 0) return;
    pages.push({ pageIndex: pages.length, pageCount: 0, titles, cells });
    titles = [];
    cells = [];
    y = freshTop;
  };

  const filled = groups.filter((group) => group.photos.length > 0);
  if (filled.length === 0) {
    return [{ pageIndex: 0, pageCount: 1, titles: [{ name: groups[0]?.name ?? "", top: roundMm(freshTop) }], cells: [] }];
  }

  for (const group of filled) {
    if (!fits(titleH + cellH) && (titles.length > 0 || cells.length > 0)) flush();
    titles.push({ name: group.name, top: roundMm(y) });
    y += titleH;
    let column = 0;
    for (const photo of group.photos) {
      if (column === 0 && !fits(cellH) && cells.length > 0) {
        flush();
        titles.push({ name: group.name, top: roundMm(y) });
        y += titleH;
      }
      cells.push({
        photo,
        x: roundMm(space.margin + column * (cellW + space.gap)),
        y: roundMm(y),
        w: roundMm(cellW),
        h: roundMm(cellH),
      });
      column += 1;
      if (column === columns) {
        y += cellH + space.gap;
        column = 0;
      }
    }
    if (column !== 0) y += cellH + space.gap;
  }
  flush();
  return pages.map((item) => ({ ...item, pageCount: pages.length }));
}

export function groupCountLabel(count: number): string {
  if (count === 1) return "1 photo";
  return `${count} photos`;
}

export function photoCountLabel(count: number): string {
  if (count === 0) return "Aucune photo importée";
  if (count === 1) return "1 photo importée";
  return `${count} photos importées`;
}

export function addedLabel(count: number): string {
  if (count === 1) return "1 photo ajoutée";
  return `${count} photos ajoutées`;
}

export function importSummary(added: number, skipped: number, failed: string[]): string | null {
  const parts: string[] = [];
  if (added > 0) parts.push(addedLabel(added));
  if (skipped === 1) parts.push("1 fichier ignoré");
  else if (skipped > 1) parts.push(`${skipped} fichiers ignorés`);
  if (failed.length === 1) parts.push(`${failed[0]} illisible`);
  else if (failed.length > 1) parts.push(`${failed.length} fichiers illisibles`);
  return parts.length > 0 ? parts.join(" · ") : null;
}
