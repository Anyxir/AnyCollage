import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { dragHasFiles, endPhotoDrag } from "./drag";
import { exportCollagePdf } from "./pdf";
import { getGrid, gridCapacity } from "./grids";
import { ACCEPT_ATTR, createPhoto, isSupportedFile, preloadImage, revokePhoto } from "./images";
import { allPageSlots, importSummary, pageCountFor, pageSlots } from "./layout";
import { collageReducer, initialCollageState } from "./reducer";
import type { CollageState, Photo, SheetSettings } from "./types";

type ImportMode = { kind: "append" } | { kind: "replace"; id: string } | { kind: "insert"; index: number };

type CollageApi = {
  state: CollageState;
  settings: SheetSettings;
  grid: ReturnType<typeof getGrid>;
  capacity: number;
  pageCount: number;
  pageIndex: number;
  currentSlots: (Photo | null)[];
  pages: (Photo | null)[][];
  importing: boolean;
  exporting: boolean;
  printing: boolean;
  message: string | null;
  fileDragActive: boolean;
  openImporter: () => void;
  openReplace: (id: string) => void;
  openInsert: (index: number) => void;
  addFiles: (list: FileList | File[]) => Promise<void>;
  insertFiles: (index: number, list: FileList | File[]) => Promise<void>;
  replaceWithFiles: (id: string, list: FileList | File[]) => Promise<void>;
  removePhoto: (id: string) => void;
  reorder: (from: number, to: number) => void;
  swapPhotos: (a: number, b: number) => void;
  movePhotoToEnd: (index: number) => void;
  setGrid: (gridId: string) => void;
  setOrientation: (orientation: CollageState["orientation"]) => void;
  setMargin: (marginMm: number) => void;
  setGap: (gapMm: number) => void;
  setBackground: (background: string) => void;
  setBorder: (border: CollageState["border"]) => void;
  setRadius: (radius: CollageState["radius"]) => void;
  setFit: (fit: CollageState["fit"]) => void;
  setPage: (pageIndex: number) => void;
  setShowAll: (showAll: boolean) => void;
  setSelectedId: (id: string | null) => void;
  reset: () => void;
  print: () => Promise<void>;
  exportPdf: () => Promise<void>;
};

const CollageContext = createContext<CollageApi | null>(null);

export function CollageProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(collageReducer, initialCollageState);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fileDragActive, setFileDragActive] = useState(false);
  const photosRef = useRef(state.photos);
  const stateRef = useRef(state);
  const tokenRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<ImportMode>({ kind: "append" });
  const dragDepth = useRef(0);

  photosRef.current = state.photos;
  stateRef.current = state;

  useEffect(() => {
    return () => {
      photosRef.current.forEach(revokePhoto);
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    const styleId = "anycollage-page-size";
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `@page { size: A4 ${state.orientation}; margin: 0; }`;
  }, [state.orientation]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (photosRef.current.length === 0) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const collect = useCallback(async (list: FileList | File[], token: number) => {
    const files = [...list];
    const supported = files.filter(isSupportedFile);
    const skipped = files.length - supported.length;
    const created: Photo[] = [];
    const failed: string[] = [];
    for (let index = 0; index < supported.length; index += 1) {
      if (token !== tokenRef.current) break;
      const file = supported[index];
      if (!file) continue;
      setMessage(`Importation ${index + 1} / ${supported.length}`);
      try {
        const photo = await createPhoto(file);
        if (token !== tokenRef.current) {
          revokePhoto(photo);
          break;
        }
        created.push(photo);
        preloadImage(photo.url);
      } catch {
        failed.push(file.name);
      }
    }
    return { created, skipped, failed };
  }, []);

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      const token = tokenRef.current;
      setImporting(true);
      try {
        const { created, skipped, failed } = await collect(list, token);
        if (token !== tokenRef.current || created.length === 0) {
          created.forEach(revokePhoto);
          setMessage(importSummary(0, skipped, failed));
          return;
        }
        dispatch({ type: "add", photos: created });
        setMessage(importSummary(created.length, skipped, failed));
      } finally {
        if (token === tokenRef.current) setImporting(false);
      }
    },
    [collect],
  );

  const insertFiles = useCallback(
    async (index: number, list: FileList | File[]) => {
      const token = tokenRef.current;
      setImporting(true);
      try {
        const { created, skipped, failed } = await collect(list, token);
        if (token !== tokenRef.current || created.length === 0) {
          created.forEach(revokePhoto);
          setMessage(importSummary(0, skipped, failed));
          return;
        }
        dispatch({ type: "insert", index, photos: created });
        setMessage(importSummary(created.length, skipped, failed));
      } finally {
        if (token === tokenRef.current) setImporting(false);
      }
    },
    [collect],
  );

  const replaceWithFiles = useCallback(
    async (id: string, list: FileList | File[]) => {
      const token = tokenRef.current;
      const previous = photosRef.current.find((photo) => photo.id === id);
      if (!previous) return;
      setImporting(true);
      try {
        const { created, skipped, failed } = await collect(list, token);
        if (token !== tokenRef.current || created.length === 0) {
          created.forEach(revokePhoto);
          setMessage(importSummary(0, skipped, failed));
          return;
        }
        const position = photosRef.current.findIndex((photo) => photo.id === id);
        if (position < 0) {
          created.forEach(revokePhoto);
          return;
        }
        const [first, ...rest] = created;
        if (!first) return;
        revokePhoto(previous);
        dispatch({ type: "replace", id, photo: first });
        if (rest.length > 0) {
          dispatch({ type: "insert", index: position + 1, photos: rest });
        }
        setMessage(rest.length > 0 ? importSummary(created.length, skipped, failed) : "Photo remplacée");
      } finally {
        if (token === tokenRef.current) setImporting(false);
      }
    },
    [collect],
  );

  useEffect(() => {
    const onDragEnter = (event: DragEvent) => {
      if (!dragHasFiles(event.dataTransfer)) return;
      dragDepth.current += 1;
      setFileDragActive(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (dragHasFiles(event.dataTransfer) || event.dataTransfer?.types.includes("text/plain")) {
        event.preventDefault();
      }
    };
    const onDragLeave = (event: DragEvent) => {
      if (!dragHasFiles(event.dataTransfer)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setFileDragActive(false);
    };
    const onDrop = (event: DragEvent) => {
      dragDepth.current = 0;
      setFileDragActive(false);
      endPhotoDrag();
      if (!dragHasFiles(event.dataTransfer) || !event.dataTransfer) return;
      event.preventDefault();
      void addFiles(event.dataTransfer.files);
    };
    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragenter", onDragEnter);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDrop);
    };
  }, [addFiles]);

  const openPicker = (mode: ImportMode) => {
    modeRef.current = mode;
    const input = inputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  };

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const mode = modeRef.current;
    if (mode.kind === "replace") void replaceWithFiles(mode.id, files);
    else if (mode.kind === "insert") void insertFiles(mode.index, files);
    else void addFiles(files);
  };

  const removePhoto = useCallback((id: string) => {
    const photo = photosRef.current.find((item) => item.id === id);
    if (!photo) return;
    revokePhoto(photo);
    dispatch({ type: "remove", id });
  }, []);

  const reset = useCallback(() => {
    if (photosRef.current.length > 0) {
      const confirmed = window.confirm("Effacer toutes les photos et revenir aux réglages d'origine ?");
      if (!confirmed) return;
    }
    tokenRef.current += 1;
    photosRef.current.forEach(revokePhoto);
    setImporting(false);
    setExporting(false);
    setMessage(null);
    dispatch({ type: "reset" });
  }, []);

  const printLock = useRef(false);

  const print = useCallback(async () => {
    if (photosRef.current.length === 0 || printLock.current) return;
    printLock.current = true;
    flushSync(() => setPrinting(true));
    document.body.classList.add("is-printing");
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    const root = document.getElementById("print-root");
    const images = [...(root?.querySelectorAll("img") ?? [])];
    const loaded = Promise.all(
      images.map(async (image) => {
        if (image.complete && image.naturalWidth > 0) return;
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
        });
      }),
    );
    await Promise.race([loaded, new Promise((resolve) => window.setTimeout(resolve, 12000))]);
    try {
      window.print();
    } catch {
      printLock.current = false;
      document.body.classList.remove("is-printing");
      setPrinting(false);
    }
  }, []);

  useEffect(() => {
    const finish = () => {
      printLock.current = false;
      document.body.classList.remove("is-printing");
      setPrinting(false);
    };
    const media = window.matchMedia("print");
    const onMedia = () => {
      if (!media.matches) finish();
    };
    window.addEventListener("afterprint", finish);
    media.addEventListener("change", onMedia);
    return () => {
      window.removeEventListener("afterprint", finish);
      media.removeEventListener("change", onMedia);
    };
  }, []);

  const exportPdf = useCallback(async () => {
    if (photosRef.current.length === 0 || exporting) return;
    const current = stateRef.current;
    const grid = getGrid(current.gridId);
    setExporting(true);
    try {
      await exportCollagePdf({
        photos: current.photos,
        grid,
        settings: {
          orientation: current.orientation,
          marginMm: current.marginMm,
          gapMm: current.gapMm,
          background: current.background,
          border: current.border,
          radius: current.radius,
          fit: current.fit,
        },
        onProgress: (page, total) => setMessage(`PDF : page ${page} / ${total}`),
      });
      setMessage("PDF enregistré");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "erreur inconnue";
      setMessage(`Export PDF impossible (${detail}).`);
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        void print();
        return;
      }
      const capacity = gridCapacity(getGrid(stateRef.current.gridId));
      const count = pageCountFor(stateRef.current.photos.length, capacity);
      if (event.key === "ArrowRight") {
        dispatch({ type: "page", pageIndex: Math.min(count - 1, stateRef.current.pageIndex + 1) });
      } else if (event.key === "ArrowLeft") {
        dispatch({ type: "page", pageIndex: Math.max(0, stateRef.current.pageIndex - 1) });
      } else if (event.key === "Delete" && stateRef.current.selectedId) {
        removePhoto(stateRef.current.selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [print, removePhoto]);

  const grid = getGrid(state.gridId);
  const capacity = gridCapacity(grid);
  const pageCount = pageCountFor(state.photos.length, capacity);
  const pageIndex = Math.max(0, Math.min(state.pageIndex, pageCount - 1));
  const pages = useMemo(() => allPageSlots(state.photos, capacity), [state.photos, capacity]);
  const currentSlots = pageSlots(state.photos, pageIndex, capacity);

  const settings: SheetSettings = {
    orientation: state.orientation,
    marginMm: state.marginMm,
    gapMm: state.gapMm,
    background: state.background,
    border: state.border,
    radius: state.radius,
    fit: state.fit,
  };

  const api: CollageApi = {
    state,
    settings,
    grid,
    capacity,
    pageCount,
    pageIndex,
    currentSlots,
    pages,
    importing,
    exporting,
    printing,
    message,
    fileDragActive,
    openImporter: () => openPicker({ kind: "append" }),
    openReplace: (id: string) => openPicker({ kind: "replace", id }),
    openInsert: (index: number) => openPicker({ kind: "insert", index }),
    addFiles,
    insertFiles,
    replaceWithFiles,
    removePhoto,
    reorder: (from, to) => dispatch({ type: "reorder", from, to }),
    swapPhotos: (a, b) => dispatch({ type: "swap", a, b }),
    movePhotoToEnd: (index) => dispatch({ type: "move-end", index }),
    setGrid: (gridId) => dispatch({ type: "grid", gridId }),
    setOrientation: (orientation) => dispatch({ type: "orientation", orientation }),
    setMargin: (marginMm) => dispatch({ type: "margin", marginMm }),
    setGap: (gapMm) => dispatch({ type: "gap", gapMm }),
    setBackground: (background) => dispatch({ type: "background", background }),
    setBorder: (border) => dispatch({ type: "border", border }),
    setRadius: (radius) => dispatch({ type: "radius", radius }),
    setFit: (fit) => dispatch({ type: "fit", fit }),
    setPage: (next) => dispatch({ type: "page", pageIndex: next }),
    setShowAll: (showAll) => dispatch({ type: "show-all", showAll }),
    setSelectedId: (id) => dispatch({ type: "select", id }),
    reset,
    print,
    exportPdf,
  };

  return (
    <CollageContext.Provider value={api}>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        onChange={onInput}
      />
      {children}
    </CollageContext.Provider>
  );
}

export function useCollage(): CollageApi {
  const value = useContext(CollageContext);
  if (!value) throw new Error("useCollage doit être utilisé dans CollageProvider");
  return value;
}
