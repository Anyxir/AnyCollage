import { DEFAULT_GRID_ID, GRIDS, getGrid, gridCapacity } from "./grids";
import { borderColorFor, containDest, coverSource, pageSize, sheetLayout } from "./geometry";
import { allPageSlots, arrayMove, pageCountFor, photoCountLabel, swapItems } from "./layout";
import { collageReducer, initialCollageState } from "./reducer";
import type { Photo } from "./types";
import { describe, expect, it } from "vitest";

function fake(count: number): Photo[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `photo-${index + 1}.jpg`,
    url: `blob:photo-${index + 1}`,
    thumbUrl: `blob:thumb-${index + 1}`,
    width: index % 3 === 0 ? 1200 : index % 3 === 1 ? 800 : 1000,
    height: index % 3 === 0 ? 800 : index % 3 === 1 ? 1400 : 1000,
  }));
}

describe("grids", () => {
  it("exposes every requested model, with 5×6 as a normal 30-slot option", () => {
    expect(GRIDS.map((grid) => grid.name)).toEqual([
      "1 photo",
      "2 photos",
      "3 photos",
      "4 photos",
      "6 photos",
      "8 photos",
      "9 photos",
      "12 photos",
      "15 photos",
      "16 photos",
      "30 photos — 5 × 6",
    ]);
    const grid = getGrid("grid-5x6");
    expect(grid.rows).toBe(6);
    expect(grid.columns).toBe(5);
    expect(gridCapacity(grid)).toBe(30);
    expect(grid.slots).toHaveLength(30);
    expect(DEFAULT_GRID_ID).toBe("grid-4");
    expect(DEFAULT_GRID_ID).not.toBe("grid-5x6");
  });

  it("numbers the 5×6 grid from left to right, then top to bottom", () => {
    const grid = getGrid("grid-5x6");
    expect(grid.slots[0]).toEqual({ index: 1, row: 0, column: 0 });
    expect(grid.slots[4]).toEqual({ index: 5, row: 0, column: 4 });
    expect(grid.slots[5]).toEqual({ index: 6, row: 1, column: 0 });
    expect(grid.slots[29]).toEqual({ index: 30, row: 5, column: 4 });
    for (const item of GRIDS) {
      expect(item.slots.length).toBe(item.rows * item.columns);
    }
  });
});

describe("pages", () => {
  const counts = [1, 2, 5, 9, 10, 29, 30, 31, 60, 61, 73, 100];

  it("packs photos without duplicates or invented slots", () => {
    for (const grid of GRIDS) {
      const capacity = gridCapacity(grid);
      for (const count of counts) {
        const pages = allPageSlots(
          Array.from({ length: count }, (_, index) => index + 1),
          capacity,
        );
        expect(pages).toHaveLength(pageCountFor(count, capacity));
        const filled = pages.flatMap((page) => page.filter((value) => value !== null));
        expect(filled).toEqual(Array.from({ length: count }, (_, index) => index + 1));
        const last = pages[pages.length - 1] ?? [];
        expect(last.filter((value) => value === null).length).toBe(
          count === 0 ? capacity : (capacity - (count % capacity)) % capacity,
        );
      }
    }
  });

  it("matches the 9-photo and 5×6 examples", () => {
    expect(pageCountFor(25, 9)).toBe(3);
    const nine = allPageSlots(Array.from({ length: 25 }, (_, i) => i + 1), 9);
    expect(nine[0]?.filter(Boolean)).toHaveLength(9);
    expect(nine[1]?.filter(Boolean)).toHaveLength(9);
    expect(nine[2]?.filter(Boolean)).toHaveLength(7);

    expect(pageCountFor(30, 30)).toBe(1);
    expect(pageCountFor(31, 30)).toBe(2);
    expect(pageCountFor(60, 30)).toBe(2);
    expect(pageCountFor(61, 30)).toBe(3);
    expect(pageCountFor(73, 30)).toBe(3);

    const seventyThree = allPageSlots(Array.from({ length: 73 }, (_, i) => i + 1), 30);
    expect(seventyThree).toHaveLength(3);
    expect(seventyThree[0]?.filter(Boolean)).toHaveLength(30);
    expect(seventyThree[1]?.filter(Boolean)).toHaveLength(30);
    expect(seventyThree[2]?.filter(Boolean)).toHaveLength(13);
    expect(seventyThree[2]?.filter((value) => value === null)).toHaveLength(17);
  });

  it("keeps a single empty page when there are no photos", () => {
    expect(pageCountFor(0, 30)).toBe(1);
    expect(allPageSlots([], 4)).toEqual([[null, null, null, null]]);
  });
});

describe("order", () => {
  it("swaps photo 3 with photo 8 without losing photos", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const swapped = swapItems(items, 2, 7);
    expect(swapped[2]).toBe(8);
    expect(swapped[7]).toBe(3);
    expect(new Set(swapped).size).toBe(10);
  });

  it("reorders a library item to a new index", () => {
    expect(arrayMove(["a", "b", "c", "d"], 0, 3)).toEqual(["b", "c", "d", "a"]);
    expect(arrayMove(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
  });
});

describe("sheet geometry", () => {
  it("uses real A4 millimetres and places 30 cells inside the margins", () => {
    expect(pageSize("portrait")).toEqual({ width: 210, height: 297 });
    expect(pageSize("landscape")).toEqual({ width: 297, height: 210 });
    const { cells, space } = sheetLayout(
      { rows: 6, columns: 5 },
      { orientation: "portrait", marginMm: 5, gapMm: 3 },
    );
    expect(cells).toHaveLength(30);
    expect(space).toEqual({ margin: 5, gap: 3 });
    const first = cells[0];
    const second = cells[1];
    const sixth = cells[5];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(sixth).toBeDefined();
    if (!first || !second || !sixth) return;
    expect(first.x).toBeCloseTo(5, 2);
    expect(first.y).toBeCloseTo(5, 2);
    expect(second.x).toBeGreaterThan(first.x);
    expect(second.y).toBeCloseTo(first.y, 2);
    expect(second.x - (first.x + first.w)).toBeCloseTo(3, 1);
    expect(sixth.y).toBeGreaterThan(first.y);
    for (const cell of cells) {
      expect(cell.w).toBeGreaterThan(0);
      expect(cell.h).toBeGreaterThan(0);
      expect(cell.x).toBeGreaterThanOrEqual(5);
      expect(cell.y).toBeGreaterThanOrEqual(5);
      expect(cell.x + cell.w).toBeLessThanOrEqual(205.01);
      expect(cell.y + cell.h).toBeLessThanOrEqual(292.01);
    }
  });

  it("keeps portrait, landscape and square photos undistorted", () => {
    const portrait = coverSource(1000, 1600, 300, 400);
    expect(portrait.sw / portrait.sh).toBeCloseTo(300 / 400, 5);
    expect(portrait.sh).toBeLessThan(1600);

    const landscape = coverSource(1600, 1000, 300, 400);
    expect(landscape.sw / landscape.sh).toBeCloseTo(300 / 400, 5);
    expect(landscape.sw).toBeLessThan(1600);

    const square = coverSource(1000, 1000, 500, 500);
    expect(square).toMatchObject({ sx: 0, sy: 0, sw: 1000, sh: 1000 });

    const contained = containDest(1600, 1000, 300, 400);
    expect(contained.w / contained.h).toBeCloseTo(1600 / 1000, 5);
    expect(contained.w).toBeLessThanOrEqual(300);
    expect(contained.h).toBeLessThanOrEqual(400);
  });

  it("picks a readable border color from the sheet background", () => {
    expect(borderColorFor("#ffffff")).toBe("#1c1915");
    expect(borderColorFor("#111111")).toBe("#f4f1ea");
  });
});

describe("reducer", () => {
  it("recalculates the visible page when the grid or the photo count changes", () => {
    let state = collageReducer(initialCollageState, { type: "grid", gridId: "grid-1" });
    state = collageReducer(state, { type: "add", photos: fake(5) });
    state = collageReducer(state, { type: "page", pageIndex: 4 });
    expect(state.pageIndex).toBe(4);
    state = collageReducer(state, { type: "grid", gridId: "grid-4" });
    expect(state.gridId).toBe("grid-4");
    expect(pageCountFor(state.photos.length, 4)).toBe(2);
    expect(state.pageIndex).toBe(1);
  });

  it("resets to the 4-photo grid", () => {
    let state = collageReducer(initialCollageState, { type: "grid", gridId: "grid-5x6" });
    state = collageReducer(state, { type: "add", photos: fake(73) });
    state = collageReducer(state, { type: "reset" });
    expect(state).toEqual(initialCollageState);
    expect(state.gridId).toBe("grid-4");
  });

  it("describes the library count in French", () => {
    expect(photoCountLabel(0)).toBe("Aucune photo importée");
    expect(photoCountLabel(1)).toBe("1 photo importée");
    expect(photoCountLabel(32)).toBe("32 photos importées");
  });
});
