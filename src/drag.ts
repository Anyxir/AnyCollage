let dragIndex: number | null = null;

export function beginPhotoDrag(index: number, dataTransfer: DataTransfer): void {
  dragIndex = index;
  dataTransfer.effectAllowed = "move";
  dataTransfer.setData("text/plain", String(index));
}

export function photoDragIndex(): number | null {
  return dragIndex;
}

export function endPhotoDrag(): void {
  dragIndex = null;
}

export function dragHasFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  return [...dataTransfer.types].includes("Files");
}
