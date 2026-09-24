import { useState } from "react";
import { beginGroupDrag, beginPhotoDrag, dragHasFiles, endGroupDrag, endPhotoDrag, groupDragId, photoDragGroupId, photoDragIndex } from "../drag";
import { groupCountLabel, photoCountLabel } from "../layout";
import { useCollage } from "../state";
import { PhotoUploader } from "./PhotoUploader";

export function PhotoLibrary() {
  const {
    state,
    groups,
    activeGroup,
    importing,
    message,
    removePhoto,
    reorder,
    insertFiles,
    setSelectedId,
    openImporter,
    createGroup,
    renameGroup,
    deleteGroup,
    selectGroup,
    moveGroup,
  } = useCollage();
  const [overKey, setOverKey] = useState<string | null>(null);
  const [overGroupId, setOverGroupId] = useState<string | null>(null);
  const total = groups.reduce((sum, group) => sum + group.photos.length, 0);

  return (
    <section className="panel library no-print" aria-label="Bibliothèque de photos" data-menu="canvas">
      <header className="panel-head">
        <h2>Photos</h2>
        <p>{photoCountLabel(total)}</p>
        {importing && <p className="status">Importation en cours…</p>}
        {message && (
          <p className="status" role="status">
            {message}
          </p>
        )}
      </header>
      <button type="button" className="btn btn-accent" onClick={createGroup}>
        + Ajouter un groupe
      </button>
      {groups.map((group) => (
        <section
          key={group.id}
          data-menu="group"
          data-group-id={group.id}
          className={[
            "group-block",
            group.id === activeGroup.id ? "is-active" : "",
            overGroupId === group.id ? "is-drop" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onDragOver={(event) => {
            if (!groupDragId()) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = "move";
            setOverGroupId(group.id);
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
            setOverGroupId((current) => (current === group.id ? null : current));
          }}
          onDrop={(event) => {
            const fromId = groupDragId();
            if (!fromId) return;
            event.preventDefault();
            event.stopPropagation();
            endGroupDrag();
            setOverGroupId(null);
            const toIndex = groups.findIndex((item) => item.id === group.id);
            if (toIndex < 0 || fromId === group.id) return;
            moveGroup(fromId, toIndex);
          }}
        >
          <div className="group-block-head">
            <button
              type="button"
              className="group-grip"
              draggable
              aria-label={`Déplacer ${group.name}`}
              title="Glisser pour changer l’ordre"
              onDragStart={(event) => beginGroupDrag(group.id, event.dataTransfer)}
              onDragEnd={() => {
                endGroupDrag();
                setOverGroupId(null);
              }}
            >
              ⋮⋮
            </button>
            <input
              data-group-name={group.id}
              aria-label={`Nom du groupe ${group.name}`}
              value={group.name}
              onFocus={() => selectGroup(group.id)}
              onChange={(event) => renameGroup(group.id, event.target.value)}
              onBlur={(event) => {
                const name = event.target.value.trim();
                renameGroup(group.id, name.length > 0 ? name : "Sans nom");
              }}
            />
            <span>{groupCountLabel(group.photos.length)}</span>
            <button
              type="button"
              className="group-delete"
              aria-label={`Supprimer ${group.name}`}
              disabled={groups.length <= 1}
              onClick={() => deleteGroup(group.id)}
            >
              ×
            </button>
          </div>
          {group.photos.length === 0 ? (
            <PhotoUploader
              onBrowse={() => {
                selectGroup(group.id);
                openImporter();
              }}
            />
          ) : (
            <ul className="photo-grid">
              {group.photos.map((photo, index) => {
                const key = `${group.id}:${index}`;
                return (
                  <li
                    key={photo.id}
                    data-menu="photo"
                    data-photo-id={photo.id}
                    data-group-id={group.id}
                    className={
                      state.selectedId === photo.id ? "photo-card is-selected" : overKey === key ? "photo-card is-over" : "photo-card"
                    }
                    draggable
                    onDragStart={(event) => {
                      beginPhotoDrag(index, event.dataTransfer, group.id);
                      setSelectedId(photo.id);
                      selectGroup(group.id);
                    }}
                    onDragEnd={() => {
                      endPhotoDrag();
                      setOverKey(null);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = dragHasFiles(event.dataTransfer) ? "copy" : "move";
                      setOverKey(key);
                    }}
                    onDragLeave={() => setOverKey((current) => (current === key ? null : current))}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setOverKey(null);
                      const files = [...event.dataTransfer.files];
                      if (files.length > 0) {
                        endPhotoDrag();
                        void insertFiles(index, files, group.id);
                        return;
                      }
                      const from = photoDragIndex();
                      const fromGroup = photoDragGroupId();
                      endPhotoDrag();
                      if (from === null || fromGroup !== group.id || from === index) return;
                      reorder(from, index, group.id);
                    }}
                  >
                    <button
                      type="button"
                      className="photo-hit"
                      onClick={() => {
                        selectGroup(group.id);
                        setSelectedId(photo.id);
                      }}
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
                );
              })}
            </ul>
          )}
        </section>
      ))}
      <p className="hint">Glissez les miniatures pour changer l’ordre du collage.</p>
    </section>
  );
}

