import { DEFAULT_GRID_ID, getGrid, gridCapacity } from "./grids";
import { clampGap, clampMargin, normalizeHex } from "./geometry";
import { arrayMove, insertAt, moveToEnd, pageCountFor, swapItems } from "./layout";
import type { CollageState, Photo } from "./types";

export const initialCollageState: CollageState = {
  photos: [],
  gridId: DEFAULT_GRID_ID,
  orientation: "portrait",
  marginMm: 5,
  gapMm: 3,
  background: "#ffffff",
  border: "none",
  radius: "square",
  fit: "cover",
  pageIndex: 0,
  showAll: false,
  selectedId: null,
};

export type CollageAction =
  | { type: "add"; photos: Photo[] }
  | { type: "insert"; index: number; photos: Photo[] }
  | { type: "remove"; id: string }
  | { type: "replace"; id: string; photo: Photo }
  | { type: "reorder"; from: number; to: number }
  | { type: "swap"; a: number; b: number }
  | { type: "move-end"; index: number }
  | { type: "grid"; gridId: string }
  | { type: "orientation"; orientation: CollageState["orientation"] }
  | { type: "margin"; marginMm: number }
  | { type: "gap"; gapMm: number }
  | { type: "background"; background: string }
  | { type: "border"; border: CollageState["border"] }
  | { type: "radius"; radius: CollageState["radius"] }
  | { type: "fit"; fit: CollageState["fit"] }
  | { type: "page"; pageIndex: number }
  | { type: "show-all"; showAll: boolean }
  | { type: "select"; id: string | null }
  | { type: "reset" };

function clampPage(state: CollageState): CollageState {
  const capacity = gridCapacity(getGrid(state.gridId));
  const count = pageCountFor(state.photos.length, capacity);
  const pageIndex = Math.max(0, Math.min(state.pageIndex, count - 1));
  if (pageIndex === state.pageIndex) return state;
  return { ...state, pageIndex };
}

export function collageReducer(state: CollageState, action: CollageAction): CollageState {
  switch (action.type) {
    case "add":
      if (action.photos.length === 0) return state;
      return clampPage({ ...state, photos: [...state.photos, ...action.photos] });
    case "insert":
      return clampPage({
        ...state,
        photos: insertAt(state.photos, action.index, action.photos),
      });
    case "remove":
      return clampPage({
        ...state,
        photos: state.photos.filter((photo) => photo.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      });
    case "replace": {
      if (!state.photos.some((photo) => photo.id === action.id)) return state;
      return {
        ...state,
        photos: state.photos.map((photo) => (photo.id === action.id ? action.photo : photo)),
        selectedId: state.selectedId === action.id ? action.photo.id : state.selectedId,
      };
    }
    case "reorder":
      return { ...state, photos: arrayMove(state.photos, action.from, action.to) };
    case "swap":
      return { ...state, photos: swapItems(state.photos, action.a, action.b) };
    case "move-end":
      return { ...state, photos: moveToEnd(state.photos, action.index) };
    case "grid":
      return clampPage({ ...state, gridId: getGrid(action.gridId).id });
    case "orientation":
      return { ...state, orientation: action.orientation };
    case "margin":
      return { ...state, marginMm: clampMargin(action.marginMm) };
    case "gap":
      return { ...state, gapMm: clampGap(action.gapMm) };
    case "background":
      return { ...state, background: normalizeHex(action.background) };
    case "border":
      return { ...state, border: action.border };
    case "radius":
      return { ...state, radius: action.radius };
    case "fit":
      return { ...state, fit: action.fit };
    case "page":
      return clampPage({ ...state, pageIndex: action.pageIndex });
    case "show-all":
      return { ...state, showAll: action.showAll };
    case "select":
      return { ...state, selectedId: action.id };
    case "reset":
      return initialCollageState;
    default:
      return state;
  }
}
