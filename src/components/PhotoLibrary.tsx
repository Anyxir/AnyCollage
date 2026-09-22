import { useState } from "react";
import { beginPhotoDrag, dragHasFiles, endPhotoDrag, photoDragIndex } from "../drag";
import { photoCountLabel } from "../layout";
import { useCollage } from "../state";
import { PhotoUploader } from "./PhotoUploader";

export function PhotoLibrary() {
  const {
    state,
    importing,
    message,
    removePhoto,
    reorder,
    insertFiles,
    setSelectedId,
    openImporter,
  } = useCollage();
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <section className="panel library no-print" aria-label="Bibliothèque de photos">
      <header className="panel-head">
        <h2>Photos</h2>
        <p>{photoCountLabel(state.photos.length)}</p>
        {importing && <p className="status">Importation en cours…</p>}
        {message && (
          <p className="status" role="status">
            {message}
          </p>
        )}
      </header>

      {state.photos.length === 0 ? (
        <PhotoUploader onBrowse={openImporter} />
      ) : (
        <ul className="photo-grid">
          {state.photos.map((photo, index) => (
            <li
              key={photo.id}
              className={
                state.selectedId === photo.id
                  ? "photo-card is-selected"
                  : overIndex === index
                    ? "photo-card is-over"
                    : "photo-card"
              }
              draggable
              onDragStart={(event) => {
                beginPhotoDrag(index, event.dataTransfer);
                setSelectedId(photo.id);
              }}
              onDragEnd={() => {
                endPhotoDrag();
                setOverIndex(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = dragHasFiles(event.dataTransfer) ? "copy" : "move";
                setOverIndex(index);
              }}
              onDragLeave={() => setOverIndex((current) => (current === index ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOverIndex(null);
                const files = [...event.dataTransfer.files];
                if (files.length > 0) {
                  endPhotoDrag();
                  void insertFiles(index, files);
                  return;
                }
                const from = photoDragIndex();
                endPhotoDrag();
                if (from === null || from === index) return;
                reorder(from, index);
              }}
            >
              <button
                type="button"
                className="photo-hit"
                onClick={() => setSelectedId(photo.id)}
                aria-pressed={state.selectedId === photo.id}
                aria-label={`Photo ${index + 1}, ${photo.name}`}
              >
                <img src={photo.thumbUrl} alt="" loading="lazy" decoding="async" />
                <span className="photo-index">{index + 1}</span>
              </button>
              <button
                type="button"
                className="photo-delete"
                aria-label={`Supprimer ${photo.name}`}
                onClick={() => removePhoto(photo.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">Glissez les miniatures pour changer l’ordre du collage.</p>
    </section>
  );
}
