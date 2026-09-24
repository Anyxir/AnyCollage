import { DEFAULT_GRID_ID, getGrid } from "./grids";
import { clampGap, clampMargin, clampTitleGap, clampTitleOffset, clampTitleSize, normalizeHex } from "./geometry";
import { arrayMove, insertAt, moveToEnd, separatedSheets, swapItems } from "./layout";
import type { CollageState, Photo, PhotoGroup, TitleWeight } from "./types";

export function createGroup(id: string, name: string): PhotoGroup {
  return { id, name, photos: [] };
}

export const initialCollageState: CollageState = {
  groups: [createGroup("group-1", "Groupe 1")],
  activeGroupId: "group-1",
  nextGroupNumber: 2,
  titleSizeMm: 6,
  titleWeight: 700,
  titleOffsetMm: 0,
  titleGapMm: 3,
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
  | { type: "insert"; index: number; photos: Photo[]; groupId?: string }
  | { type: "remove"; id: string }
  | { type: "replace"; id: string; photo: Photo }
  | { type: "reorder"; from: number; to: number; groupId?: string }
  | { type: "swap"; a: number; b: number; groupId?: string }
  | { type: "move-end"; index: number; groupId?: string }
  | { type: "create-group" }
  | { type: "rename-group"; id: string; name: string }
  | { type: "delete-group"; id: string }
  | { type: "move-group"; id: string; toIndex: number }
  | { type: "transfer-photo"; photoId: string; toId: string }
  | { type: "select-group"; id: string }
  | { type: "title-size"; sizeMm: number }
  | { type: "title-weight"; weight: TitleWeight }
  | { type: "title-offset"; offsetMm: number }
  | { type: "title-gap"; gapMm: number }
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

export function activeGroup(state: CollageState): PhotoGroup {
  return state.groups.find((group) => group.id === state.activeGroupId) ?? state.groups[0]!;
}

export function activePhotos(state: CollageState): Photo[] {
  return activeGroup(state).photos;
}

export function allPhotos(state: CollageState): Photo[] {
  return state.groups.flatMap((group) => group.photos);
}

export function titleSettingsOf(state: CollageState) {
  return {
    sizeMm: state.titleSizeMm,
    weight: state.titleWeight,
    offsetMm: state.titleOffsetMm,
    gapMm: state.titleGapMm,
  };
}

function withGroupPhotos(state: CollageState, groupId: string, photos: Photo[]): CollageState {
  return {
    ...state,
    groups: state.groups.map((group) => (group.id === groupId ? { ...group, photos } : group)),
  };
}

function withActivePhotos(state: CollageState, photos: Photo[]): CollageState {
  return withGroupPhotos(state, state.activeGroupId, photos);
}

function sheetCount(state: CollageState): number {
  const grid = getGrid(state.gridId);
  return Math.max(
    1,
    separatedSheets(state.groups, grid, {
      orientation: state.orientation,
      marginMm: state.marginMm,
      gapMm: state.gapMm,
    }, titleSettingsOf(state)).length,
  );
}

function clampPage(state: CollageState): CollageState {
  const pageIndex = Math.max(0, Math.min(state.pageIndex, sheetCount(state) - 1));
  if (pageIndex === state.pageIndex) return state;
  return { ...state, pageIndex };
}

function cleanName(name: string): string {
  return name.slice(0, 48);
}

export function collageReducer(state: CollageState, action: CollageAction): CollageState {
  switch (action.type) {
    case "add":
      if (action.photos.length === 0) return state;
      return clampPage(withActivePhotos(state, [...activePhotos(state), ...action.photos]));
    case "insert": {
      const groupId = action.groupId ?? state.activeGroupId;
      const group = state.groups.find((item) => item.id === groupId);
      if (!group) return state;
      return clampPage(withGroupPhotos(state, groupId, insertAt(group.photos, action.index, action.photos)));
    }
    case "remove":
      return clampPage({
        ...state,
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        groups: state.groups.map((group) => ({
          ...group,
          photos: group.photos.filter((photo) => photo.id !== action.id),
        })),
      });
    case "replace": {
      const group = state.groups.find((item) => item.photos.some((photo) => photo.id === action.id));
      if (!group) return state;
      return withGroupPhotos(
        { ...state, selectedId: state.selectedId === action.id ? action.photo.id : state.selectedId },
        group.id,
        group.photos.map((photo) => (photo.id === action.id ? action.photo : photo)),
      );
    }
    case "reorder": {
      const groupId = action.groupId ?? state.activeGroupId;
      const group = state.groups.find((item) => item.id === groupId);
      if (!group) return state;
      return withGroupPhotos(state, groupId, arrayMove(group.photos, action.from, action.to));
    }
    case "swap": {
      const groupId = action.groupId ?? state.activeGroupId;
      const group = state.groups.find((item) => item.id === groupId);
      if (!group) return state;
      return withGroupPhotos(state, groupId, swapItems(group.photos, action.a, action.b));
    }
    case "move-end": {
      const groupId = action.groupId ?? state.activeGroupId;
      const group = state.groups.find((item) => item.id === groupId);
      if (!group) return state;
      return withGroupPhotos(state, groupId, moveToEnd(group.photos, action.index));
    }
    case "create-group": {
      const id = `group-${state.nextGroupNumber}`;
      const group = createGroup(id, `Groupe ${state.nextGroupNumber}`);
      return {
        ...state,
        groups: [...state.groups, group],
        activeGroupId: id,
        nextGroupNumber: state.nextGroupNumber + 1,
        pageIndex: 0,
        selectedId: null,
        showAll: false,
      };
    }
    case "rename-group":
      return {
        ...state,
        groups: state.groups.map((group) =>
          group.id === action.id ? { ...group, name: cleanName(action.name) } : group,
        ),
      };
    case "transfer-photo": {
      const source = state.groups.find((group) => group.photos.some((photo) => photo.id === action.photoId));
      const photo = source?.photos.find((item) => item.id === action.photoId);
      if (!source || !photo || source.id === action.toId) return state;
      if (!state.groups.some((group) => group.id === action.toId)) return state;
      return clampPage({
        ...state,
        activeGroupId: action.toId,
        selectedId: photo.id,
        groups: state.groups.map((group) => {
          if (group.id === source.id) return { ...group, photos: group.photos.filter((item) => item.id !== photo.id) };
          if (group.id === action.toId) return { ...group, photos: [...group.photos, photo] };
          return group;
        }),
      });
    }
    case "move-group": {
      const from = state.groups.findIndex((group) => group.id === action.id);
      if (from < 0) return state;
      return { ...state, groups: arrayMove(state.groups, from, action.toIndex) };
    }
    case "delete-group": {
      if (state.groups.length <= 1) return state;
      const groups = state.groups.filter((group) => group.id !== action.id);
      const activeGroupId = state.activeGroupId === action.id ? groups[0]!.id : state.activeGroupId;
      return clampPage({ ...state, groups, activeGroupId, pageIndex: 0, selectedId: null });
    }
    case "select-group":
      if (!state.groups.some((group) => group.id === action.id) || action.id === state.activeGroupId) return state;
      return { ...state, activeGroupId: action.id, pageIndex: 0, selectedId: null, showAll: false };
    case "title-size":
      return { ...state, titleSizeMm: clampTitleSize(action.sizeMm) };
    case "title-weight":
      return { ...state, titleWeight: action.weight };
    case "title-offset":
      return { ...state, titleOffsetMm: clampTitleOffset(action.offsetMm) };
    case "title-gap":
      return { ...state, titleGapMm: clampTitleGap(action.gapMm) };
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
