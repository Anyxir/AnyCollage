import { useState } from "react";
import { beginPhotoDrag, dragHasFiles, endPhotoDrag, photoDragGroupId, photoDragIndex } from "../drag";
import { BORDER_MM, RADIUS_MM, borderColorFor, pageSize } from "../geometry";
import type { PlacedCell, PlacedTitle } from "../layout";
import { useCollage } from "../state";
import type { Photo } from "../types";

type A4PageProps = {
  titles: PlacedTitle[];
  cells: PlacedCell<Photo>[];
  pageIndex: number;
  interactive: boolean;
};

export function A4Page({ titles, cells, pageIndex, interactive }: A4PageProps) {
  const {
    grid,
    settings,
    title,
    photos,
    groups,
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
  const page = pageSize(settings.orientation);
  const borderMm = BORDER_MM[settings.border];
  const radiusMm = RADIUS_MM[settings.radius];
  const borderColor = borderColorFor(settings.background);
  const [over, setOver] = useState<number | null>(null);
  const filled = cells.length;

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
      <p className="sheet-number">{pageIndex + 1}</p>
      {titles.map((item) => (
        <h3
          key={`${item.name}-${item.top}`}
          className="sheet-title"
          style={{
            top: `${item.top}mm`,
            fontSize: `${title.sizeMm}mm`,
            fontWeight: title.weight,
          }}
        >
          {item.name}
        </h3>
      ))}
      {interactive && groups.every((item) => item.photos.length === 0) && (
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
        const photo = cell.photo;
        const globalIndex = localIndex;
        const selected = photo !== null && state.selectedId === photo.id;
        return (
          <div
            key={grid.slots[localIndex]?.index ?? localIndex}
            data-menu={photo ? "photo" : undefined}
            data-photo-id={photo?.id}
            data-group-id={photo ? groups.find((item) => item.photos.some((candidate) => candidate.id === photo.id))?.id : undefined}
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
              const owner = groups.find((item) => item.photos.some((candidate) => candidate.id === photo.id));
              const index = owner?.photos.findIndex((candidate) => candidate.id === photo.id) ?? -1;
              if (!owner || index < 0) return;
              beginPhotoDrag(index, event.dataTransfer, owner.id);
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
                else void insertFiles(photos.length, files);
                return;
              }
              const from = photoDragIndex();
              const fromGroup = photoDragGroupId();
              endPhotoDrag();
              if (from === null || !fromGroup) return;
              if (!photo) {
                movePhotoToEnd(from, fromGroup);
                return;
              }
              const owner = groups.find((item) => item.photos.some((candidate) => candidate.id === photo.id));
              const target = owner?.photos.findIndex((candidate) => candidate.id === photo.id) ?? -1;
              if (!owner || target < 0 || owner.id !== fromGroup || target === from) return;
              swapPhotos(from, target, owner.id);
            }}
            onClick={() => {
              if (photo) setSelectedId(photo.id);
            }}
          >
            {photo && (
              <img
                src={photo.url}
                alt=""
                draggable={false}
                style={{ objectFit: settings.fit }}
                onError={(event) => {
                  if (event.currentTarget.src !== photo.thumbUrl) event.currentTarget.src = photo.thumbUrl;
                }}
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
                  <button type="button" onClick={() => openInsert(photos.length)}>
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
