import { useEffect, useRef, useState } from "react";
import { pageSize } from "../geometry";
import { useCollage } from "../state";
import { A4Page } from "./A4Page";
import { PageNavigator } from "./PageNavigator";
import { PageThumbnail } from "./PageThumbnail";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;

function mmToPx(mm: number): number {
  return (mm * 96) / 25.4;
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 10) / 10));
}

export function PrintPreview() {
  const collage = useCollage();
  const hostRef = useRef<HTMLDivElement>(null);
  const fitScaleRef = useRef(0.6);
  const manualZoomRef = useRef(false);
  const [scale, setScale] = useState(0.6);
  const [manualZoom, setManualZoom] = useState(false);
  const size = pageSize(collage.settings.orientation);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => {
      const availableW = Math.max(120, host.clientWidth - 36);
      const availableH = Math.max(120, host.clientHeight - 36);
      const next = Math.min(availableW / mmToPx(size.width), availableH / mmToPx(size.height), MAX_ZOOM);
      const fitted = Math.max(MIN_ZOOM, next);
      fitScaleRef.current = fitted;
      if (!manualZoomRef.current) setScale(fitted);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [size.width, size.height, collage.state.showAll]);

  const setManualScale = (next: number) => {
    manualZoomRef.current = true;
    setManualZoom(true);
    setScale(clampZoom(next));
  };

  const fitPage = () => {
    manualZoomRef.current = false;
    setManualZoom(false);
    setScale(fitScaleRef.current);
  };

  const sheetWidth = mmToPx(size.width);
  const sheetHeight = mmToPx(size.height);

  return (
    <>
      <section className="preview no-print" aria-label="Aperçu A4" data-menu="canvas">
        <header className="preview-head">
          <div>
            <h2>
              <img className="heading-mark" src="/logo.png" alt="" />
              Aperçu A4
            </h2>
            <p>
              {collage.pageTitle} · {size.width} × {size.height} mm ·{" "}
              {collage.pageCount === 1 ? "1 page" : `${collage.pageCount} pages`} · {collage.capacity} emplacements
            </p>
          </div>
          <p className="hint">Impression : échelle 100 %, sans en-têtes ni marges du navigateur.</p>
        </header>
        <PageNavigator />
        <div className="zoom-controls" role="group" aria-label="Zoom de l’aperçu">
          <button type="button" onClick={() => setManualScale(scale - ZOOM_STEP)} disabled={collage.state.showAll || scale <= MIN_ZOOM}>
            −
          </button>
          <span>{Math.round(scale * 100)} %</span>
          <button type="button" onClick={() => setManualScale(scale + ZOOM_STEP)} disabled={collage.state.showAll || scale >= MAX_ZOOM}>
            +
          </button>
          <button type="button" onClick={fitPage} disabled={collage.state.showAll || !manualZoom}>
            Ajuster
          </button>
        </div>
        <div className="preview-stage" ref={hostRef}>
          {collage.state.showAll ? (
            <div className="all-pages">
              {collage.sheets.map((sheet) => (
                <PageThumbnail
                  key={sheet.pageIndex}
                  titles={sheet.titles}
                  cells={sheet.cells}
                  grid={collage.grid}
                  settings={collage.settings}
                  title={collage.title}
                  label={`Page ${sheet.pageIndex + 1} / ${sheet.pageCount}`}
                  active={sheet.pageIndex === collage.pageIndex}
                  onClick={() => {
                    collage.setPage(sheet.pageIndex);
                    collage.setShowAll(false);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="scale-sizer" style={{ width: sheetWidth * scale, height: sheetHeight * scale }}>
              <div
                className="scale-sheet"
                style={{
                  width: sheetWidth,
                  height: sheetHeight,
                  transform: `scale(${scale})`,
                }}
              >
                <div key={collage.pageIndex} className="sheet-enter">
                  <A4Page
                    titles={collage.sheets[collage.pageIndex]?.titles ?? []}
                    cells={collage.sheets[collage.pageIndex]?.cells ?? []}
                    pageIndex={collage.pageIndex}
                    interactive
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      {collage.printing && (
        <div id="print-root">
          {collage.sheets.map((sheet) => (
            <A4Page key={sheet.pageIndex} titles={sheet.titles} cells={sheet.cells} pageIndex={sheet.pageIndex} interactive={false} />
          ))}
        </div>
      )}
    </>
  );
}
