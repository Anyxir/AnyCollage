export type Orientation = "portrait" | "landscape";
export type ObjectFitMode = "cover" | "contain";
export type BorderStyle = "none" | "thin" | "medium" | "thick";
export type RadiusStyle = "square" | "slight" | "round";

export type Photo = {
  id: string;
  name: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
};

export type GridSlot = {
  index: number;
  row: number;
  column: number;
};

export type GridDefinition = {
  id: string;
  name: string;
  rows: number;
  columns: number;
  slots: GridSlot[];
};

export type SheetSettings = {
  orientation: Orientation;
  marginMm: number;
  gapMm: number;
  background: string;
  border: BorderStyle;
  radius: RadiusStyle;
  fit: ObjectFitMode;
};

export type TitleWeight = 500 | 600 | 700;

export type TitleSettings = {
  sizeMm: number;
  weight: TitleWeight;
  offsetMm: number;
  gapMm: number;
};

export type PhotoGroup = {
  id: string;
  name: string;
  photos: Photo[];
};

export type CollageState = {
  groups: PhotoGroup[];
  activeGroupId: string;
  nextGroupNumber: number;
  titleSizeMm: number;
  titleWeight: TitleWeight;
  titleOffsetMm: number;
  titleGapMm: number;
  gridId: string;
  orientation: Orientation;
  marginMm: number;
  gapMm: number;
  background: string;
  border: BorderStyle;
  radius: RadiusStyle;
  fit: ObjectFitMode;
  pageIndex: number;
  showAll: boolean;
  selectedId: string | null;
};
