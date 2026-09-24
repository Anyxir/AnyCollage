let dragIndex: number | null = null;
let dragGroupId: string | null = null;
let dragGroupOrderId: string | null = null;

export function beginPhotoDrag(index: number, dataTransfer: DataTransfer, groupId: string): void {
  dragIndex = index;
  dragGroupId = groupId;
  dragGroupOrderId = null;
  dataTransfer.effectAllowed = "move";
  dataTransfer.setData("text/plain", String(index));
}

export function beginGroupDrag(groupId: string, dataTransfer: DataTransfer): void {
  dragIndex = null;
  dragGroupId = null;
  dragGroupOrderId = groupId;
  dataTransfer.effectAllowed = "move";
  dataTransfer.setData("text/plain", `group:${groupId}`);
}

export function groupDragId(): string | null {
  return dragGroupOrderId;
}

export function endGroupDrag(): void {
  dragGroupOrderId = null;
}

export function photoDragIndex(): number | null {
  return dragIndex;
}

export function photoDragGroupId(): string | null {
  return dragGroupId;
}

export function endPhotoDrag(): void {
  dragIndex = null;
  dragGroupId = null;
}

export function dragHasFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  return [...dataTransfer.types].includes("Files");
}
