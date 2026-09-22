import { useEffect, useRef, useState } from "react";
import { pageSize } from "../geometry";
import { useCollage } from "../state";
import { A4Page } from "./A4Page";
import { PageNavigator } from "./PageNavigator";
import { PageThumbnail } from "./PageThumbnail";

function mmToPx(mm: number): number {
  return (mm * 96) / 25.4;
}

export function PrintPreview() {
  const collage = useCollage();
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const size = pageSize(collage.settings.orientation);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const update = () => {
      const availableW = Math.max(120, host.clientWidth - 36);
      const availableH = Math.max(120, host.clientHeight - 36);
      const next = Math.min(availableW / mmToPx(size.width), availableH / mmToPx(size.height));
      setScale(Math.max(0.15, Math.min(next, 1.4)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [size.width, size.height, collage.state.showAll]);

  const sheetWidth = mmToPx(size.width);
  const sheetHeight = mmToPx(size.height);

  return (
    <>
      <section className="preview no-print" aria-label="Aperçu A4">
        <header className="preview-head">
          <div>
            <h2>
              <img className="heading-mark" src="/logo.png" alt="" />
              Aperçu A4
            </h2>
            <p>
              {size.width} × {size.height} mm · {collage.pageCount === 1 ? "1 page" : `${collage.pageCount} pages`} ·{" "}
              {collage.capacity} emplacements
            </p>
          </div>
          <p className="hint">Impression : échelle 100 %, sans en-têtes ni marges du navigateur.</p>
        </header>
        <PageNavigator />
        <div className="preview-stage" ref={hostRef}>
          {collage.state.showAll ? (
            <div className="all-pages">
              {collage.pages.map((slots, index) => (
                <PageThumbnail
                  key={index}
                  slots={slots}
                  grid={collage.grid}
                  settings={collage.settings}
                  label={`Page ${index + 1} / ${collage.pageCount}`}
                  active={index === collage.pageIndex}
                  onClick={() => {
                    collage.setPage(index);
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
                  <A4Page slots={collage.currentSlots} pageIndex={collage.pageIndex} interactive />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      {collage.printing && (
        <div id="print-root">
          {collage.pages.map((slots, index) => (
            <A4Page key={index} slots={slots} pageIndex={index} interactive={false} />
          ))}
        </div>
      )}
    </>
  );
}
