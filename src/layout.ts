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
