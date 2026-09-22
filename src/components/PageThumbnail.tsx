import { borderColorFor, sheetLayout } from "../geometry";
import { BORDER_MM, RADIUS_MM } from "../geometry";
import type { Photo, SheetSettings } from "../types";
import type { GridDefinition } from "../types";

type PageThumbnailProps = {
  slots: (Photo | null)[];
  grid: GridDefinition;
  settings: SheetSettings;
  label: string;
  active: boolean;
  onClick: () => void;
};

export function PageThumbnail({ slots, grid, settings, label, active, onClick }: PageThumbnailProps) {
  const { page, cells } = sheetLayout(grid, settings);
  const borderColor = borderColorFor(settings.background);
  const radius = RADIUS_MM[settings.radius];
  const border = BORDER_MM[settings.border];

  return (
    <button
      type="button"
      className={active ? "page-thumb is-active" : "page-thumb"}
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <span
        className="page-thumb-sheet"
        style={{
          aspectRatio: `${page.width} / ${page.height}`,
          background: settings.background,
        }}
      >
        {cells.map((cell, index) => {
          const photo = slots[index];
          return (
            <span
              key={index}
              className="page-thumb-cell"
              style={{
                left: `${(cell.x / page.width) * 100}%`,
                top: `${(cell.y / page.height) * 100}%`,
                width: `${(cell.w / page.width) * 100}%`,
                height: `${(cell.h / page.height) * 100}%`,
                borderRadius: `${(radius / page.width) * 100}%`,
                boxShadow: border > 0 ? `inset 0 0 0 ${(border / page.width) * 100}px ${borderColor}` : undefined,
              }}
            >
              {photo && (
                <img src={photo.thumbUrl} alt="" style={{ objectFit: settings.fit }} loading="lazy" />
              )}
            </span>
          );
        })}
      </span>
      <span className="page-thumb-label">{label}</span>
    </button>
  );
}
