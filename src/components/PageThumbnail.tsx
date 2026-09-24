import { borderColorFor, pageSize } from "../geometry";
import { BORDER_MM, RADIUS_MM } from "../geometry";
import type { PlacedCell, PlacedTitle } from "../layout";
import type { Photo, SheetSettings, TitleSettings } from "../types";
import type { GridDefinition } from "../types";

type PageThumbnailProps = {
  titles: PlacedTitle[];
  cells: PlacedCell<Photo>[];
  grid: GridDefinition;
  settings: SheetSettings;
  title: TitleSettings;
  label: string;
  active: boolean;
  onClick: () => void;
};

export function PageThumbnail({ titles, cells, settings, title, label, active, onClick }: PageThumbnailProps) {
  const page = pageSize(settings.orientation);
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
        {titles.map((item) => (
          <span
            key={`${item.name}-${item.top}`}
            className="page-thumb-title"
            style={{
              top: `${(item.top / page.height) * 100}%`,
              fontSize: `${title.sizeMm * 0.35}px`,
              color: borderColor,
            }}
          >
            {item.name}
          </span>
        ))}
        <span className="page-thumb-number" style={{ color: borderColor }}>
          {label.replace(/\D+/g, " ").trim().split(" ")[0]}
        </span>
        {cells.map((cell, index) => {
          const photo = cell.photo;
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
