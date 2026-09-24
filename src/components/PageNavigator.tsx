import { useCollage } from "../state";
import { PageThumbnail } from "./PageThumbnail";

export function PageNavigator() {
  const { pageIndex, pageCount, sheets, grid, settings, title, groups, activeGroup, state, setPage, setShowAll, selectGroup } = useCollage();

  return (
    <div className="navigator">
      <div className="group-chips" aria-label="Groupes">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            className={group.id === activeGroup.id ? "group-chip is-on" : "group-chip"}
            aria-pressed={group.id === activeGroup.id}
            onClick={() => selectGroup(group.id)}
          >
            {group.name}
          </button>
        ))}
      </div>
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
          {sheets.map((sheet) => (
            <PageThumbnail
              key={sheet.pageIndex}
              titles={sheet.titles}
              cells={sheet.cells}
              grid={grid}
              settings={settings}
              title={title}
              label={`Page ${sheet.pageIndex + 1}`}
              active={sheet.pageIndex === pageIndex}
              onClick={() => setPage(sheet.pageIndex)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
