import { useCollage } from "../state";

export function TopBar() {
  const { groups, importing, exporting, exportProgress, printing, openImporter, print, exportPdf, reset } = useCollage();
  const canOutput = groups.some((group) => group.photos.length > 0) && !exporting && !printing;

  return (
    <header className="topbar no-print">
      <div className="brand">
        <span className="brand-lockup-frame">
          <img className="brand-lockup" src="/logo_grand.png" alt="AnyCollage" />
        </span>
        <img className="brand-mark" src="/logo.png" alt="AnyCollage" />
      </div>
      <div className="topbar-actions">
        <button type="button" className={importing ? "btn btn-accent is-busy" : "btn btn-accent"} onClick={openImporter} disabled={importing}>
          Importer des photos
        </button>
        <button type="button" className="btn" onClick={openImporter} disabled={importing}>
          Ajouter des photos
        </button>
        <button
          type="button"
          className="btn btn-print"
          onClick={() => void print()}
          disabled={!canOutput}
          title={canOutput ? "Imprimer les feuilles A4" : "Importez des photos pour imprimer"}
        >
          <PrinterIcon />
          Imprimer
        </button>
        <button
          type="button"
          className={exporting ? "btn is-busy" : "btn"}
          onClick={() => void exportPdf()}
          disabled={!canOutput}
          title={canOutput ? "Enregistrer un PDF A4" : "Importez des photos pour exporter"}
        >
          {exporting && exportProgress
            ? `PDF ${exportProgress.page}/${exportProgress.total}`
            : exporting
              ? "Export…"
              : "Exporter en PDF"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={reset}>
          Réinitialiser
        </button>
      </div>
      {exportProgress && (
        <div
          className="export-bar"
          role="progressbar"
          aria-label="Export PDF"
          aria-valuemin={0}
          aria-valuemax={exportProgress.total}
          aria-valuenow={exportProgress.page}
        >
          <span
            style={{
              width: `${exportProgress.total === 0 ? 0 : (exportProgress.page / exportProgress.total) * 100}%`,
            }}
          />
        </div>
      )}
    </header>
  );
}

function PrinterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d="M6 7V3h12v4h2a2 2 0 0 1 2 2v7h-4v5H6v-5H2V9a2 2 0 0 1 2-2h2Zm2-2v2h8V5H8Zm8 12H8v-3h8v3Zm2-5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      />
    </svg>
  );
}
