import { useState } from "react";
import { beginPhotoDrag, dragHasFiles, endPhotoDrag, photoDragIndex } from "../drag";
import { BORDER_MM, RADIUS_MM, borderColorFor, sheetLayout } from "../geometry";
import { useCollage } from "../state";
import type { Photo } from "../types";

type A4PageProps = {
  slots: (Photo | null)[];
  pageIndex: number;
  interactive: boolean;
};

export function A4Page({ slots, pageIndex, interactive }: A4PageProps) {
  const {
    grid,
    capacity,
    settings,
    state,
    swapPhotos,
    movePhotoToEnd,
    removePhoto,
    replaceWithFiles,
    insertFiles,
    openReplace,
    openInsert,
    setSelectedId,
  } = useCollage();
  const { page, cells } = sheetLayout(grid, settings);
  const borderMm = BORDER_MM[settings.border];
  const radiusMm = RADIUS_MM[settings.radius];
  const borderColor = borderColorFor(settings.background);
  const [over, setOver] = useState<number | null>(null);
  const filled = slots.filter(Boolean).length;

  return (
    <article
      className="sheet"
      data-page={pageIndex + 1}
      data-filled={filled}
      style={{
        width: `${page.width}mm`,
        height: `${page.height}mm`,
        background: settings.background,
        color: borderColor,
      }}
    >
      {interactive && state.photos.length === 0 && (
        <div className="sheet-empty">
          <img className="sheet-mark" src="/logo.png" alt="" />
          <strong>Feuille A4</strong>
          <span>
            {page.width} × {page.height} mm
          </span>
          <span>Importez des photos pour remplir la grille.</span>
        </div>
      )}
      {cells.map((cell, localIndex) => {
        const photo = slots[localIndex] ?? null;
        const globalIndex = pageIndex * capacity + localIndex;
        const selected = photo !== null && state.selectedId === photo.id;
        return (
          <div
            key={grid.slots[localIndex]?.index ?? localIndex}
            className={[
              "cell",
              photo ? "has-photo" : "is-empty",
              selected ? "is-selected" : "",
              over === localIndex ? "is-over" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: `${cell.x}mm`,
              top: `${cell.y}mm`,
              width: `${cell.w}mm`,
              height: `${cell.h}mm`,
              borderRadius: `${radiusMm}mm`,
              border: borderMm > 0 ? `${borderMm}mm solid ${borderColor}` : undefined,
            }}
            draggable={interactive && photo !== null}
            onDragStart={(event) => {
              if (!interactive || !photo) return;
              beginPhotoDrag(globalIndex, event.dataTransfer);
              setSelectedId(photo.id);
            }}
            onDragEnd={() => {
              endPhotoDrag();
              setOver(null);
            }}
            onDragOver={(event) => {
              if (!interactive) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = dragHasFiles(event.dataTransfer) ? "copy" : "move";
              setOver(localIndex);
            }}
            onDrop={(event) => {
              if (!interactive) return;
              event.preventDefault();
              event.stopPropagation();
              setOver(null);
              const files = [...event.dataTransfer.files];
              if (files.length > 0) {
                endPhotoDrag();
                if (photo) void replaceWithFiles(photo.id, files);
                else void insertFiles(globalIndex, files);
                return;
              }
              const from = photoDragIndex();
              endPhotoDrag();
              if (from === null || from === globalIndex) return;
              if (globalIndex >= state.photos.length) movePhotoToEnd(from);
              else swapPhotos(from, globalIndex);
            }}
            onClick={() => {
              if (photo) setSelectedId(photo.id);
            }}
          >
            {photo && (
              <img
                src={photo.url}
                alt={photo.name}
                draggable={false}
                style={{ objectFit: settings.fit }}
              />
            )}
            {interactive && <span className="cell-index">{globalIndex + 1}</span>}
            {interactive && (
              <div className="cell-tools">
                {photo ? (
                  <>
                    <button type="button" onClick={() => openReplace(photo.id)}>
                      Remplacer
                    </button>
                    <button type="button" onClick={() => removePhoto(photo.id)}>
                      Supprimer
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => openInsert(globalIndex)}>
                    Ajouter ici
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </article>
  );
}
