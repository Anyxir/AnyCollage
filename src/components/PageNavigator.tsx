import { useCollage } from "../state";
import { PageThumbnail } from "./PageThumbnail";

export function PageNavigator() {
  const { pageIndex, pageCount, pages, grid, settings, state, setPage, setShowAll } = useCollage();

  return (
    <div className="navigator">
      <div className="navigator-main">
        <button type="button" onClick={() => setPage(pageIndex - 1)} disabled={pageIndex <= 0}>
          Précédent
        </button>
        <p className="page-label">
          Page
          <input
            type="number"
            min={1}
            max={pageCount}
            value={pageIndex + 1}
            aria-label="Numéro de page"
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              setPage(next - 1);
            }}
          />
          / {pageCount}
        </p>
        <button type="button" onClick={() => setPage(pageIndex + 1)} disabled={pageIndex >= pageCount - 1}>
          Suivant
        </button>
        <button
          type="button"
          className={state.showAll ? "btn btn-accent" : "btn"}
          aria-pressed={state.showAll}
          onClick={() => setShowAll(!state.showAll)}
        >
          {state.showAll ? "Afficher la page en cours" : "Afficher toutes les pages"}
        </button>
      </div>
      {!state.showAll && pageCount > 1 && (
        <div className="thumb-strip" aria-label="Miniatures des pages">
          {pages.map((slots, index) => (
            <PageThumbnail
              key={index}
              slots={slots}
              grid={grid}
              settings={settings}
              label={`Page ${index + 1}`}
              active={index === pageIndex}
              onClick={() => setPage(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
