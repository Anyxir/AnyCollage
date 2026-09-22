import type { GridDefinition } from "../types";

function labelCount(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

type GridCardProps = {
  grid: GridDefinition;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function GridCard({ grid, selected, onSelect }: GridCardProps) {
  return (
    <button
      type="button"
      className={selected ? "grid-card is-selected" : "grid-card"}
      aria-pressed={selected}
      onClick={() => onSelect(grid.id)}
      title={`${labelCount(grid.columns, "colonne", "colonnes")} × ${labelCount(grid.rows, "ligne", "lignes")}`}
    >
      <span
        className="grid-card-preview"
        style={{
          gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`,
        }}
        aria-hidden
      >
        {grid.slots.map((slot) => (
          <i key={slot.index} />
        ))}
      </span>
      <span className="grid-card-name">{grid.name}</span>
    </button>
  );
}
