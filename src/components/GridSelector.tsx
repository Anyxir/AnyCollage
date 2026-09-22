import { GRIDS } from "../grids";
import { useCollage } from "../state";
import { GridCard } from "./GridCard";

export function GridSelector() {
  const { state, setGrid } = useCollage();

  return (
    <section className="panel" aria-label="Choisir une grille">
      <header className="panel-head">
        <h2>Choisir une grille</h2>
      </header>
      <div className="grid-list">
        {GRIDS.map((grid) => (
          <GridCard key={grid.id} grid={grid} selected={state.gridId === grid.id} onSelect={setGrid} />
        ))}
      </div>
    </section>
  );
}
