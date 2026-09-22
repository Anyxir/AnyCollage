import type { GridDefinition, GridSlot } from "./types";

/**
 * Uniform grids are rows × columns, filled left to right, then top to bottom.
 * Add a model by appending one defineGrid() call. Capacity is rows × columns.
 */
function defineGrid(
  id: string,
  name: string,
  rows: number,
  columns: number,
): GridDefinition {
  const slots: GridSlot[] = [];
  let index = 1;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      slots.push({ index, row, column });
      index += 1;
    }
  }
  return { id, name, rows, columns, slots };
}

export const GRIDS: GridDefinition[] = [
  defineGrid("grid-1", "1 photo", 1, 1),
  defineGrid("grid-2", "2 photos", 2, 1),
  defineGrid("grid-3", "3 photos", 3, 1),
  defineGrid("grid-4", "4 photos", 2, 2),
  defineGrid("grid-6", "6 photos", 3, 2),
  defineGrid("grid-8", "8 photos", 4, 2),
  defineGrid("grid-9", "9 photos", 3, 3),
  defineGrid("grid-12", "12 photos", 4, 3),
  defineGrid("grid-15", "15 photos", 5, 3),
  defineGrid("grid-16", "16 photos", 4, 4),
  defineGrid("grid-5x6", "30 photos — 5 × 6", 6, 5),
];

/** 4 photos (2 × 2). The 5 × 6 grid is an ordinary option, never the default. */
export const DEFAULT_GRID_ID = "grid-4";

export function getGrid(id: string): GridDefinition {
  return GRIDS.find((grid) => grid.id === id) ?? GRIDS.find((grid) => grid.id === DEFAULT_GRID_ID)!;
}

export function gridCapacity(grid: GridDefinition): number {
  return grid.rows * grid.columns;
}
