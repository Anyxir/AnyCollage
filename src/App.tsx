import { PhotoLibrary } from "./components/PhotoLibrary";
import { PrintPreview } from "./components/PrintPreview";
import { GridSelector } from "./components/GridSelector";
import { SettingsPanel } from "./components/SettingsPanel";
import { TopBar } from "./components/TopBar";
import { useCollage } from "./state";

export function App() {
  const { fileDragActive } = useCollage();

  return (
    <div className="app">
      <TopBar />
      <div className="workspace">
        <PhotoLibrary />
        <PrintPreview />
        <aside className="side no-print">
          <GridSelector />
          <SettingsPanel />
        </aside>
      </div>
      {fileDragActive && (
        <div className="file-overlay no-print">
          <div>
            <img className="mark-float" src="/logo.png" alt="" width="84" height="84" />
            <strong>Déposez pour ajouter des photos</strong>
            <span>JPG, JPEG, PNG, WEBP ou HEIC</span>
          </div>
        </div>
      )}
    </div>
  );
}
