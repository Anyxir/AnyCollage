import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useCollage } from "../state";

type MenuState = {
  x: number;
  y: number;
  kind: string;
  photoId: string;
  groupId: string;
};

type Item = {
  id: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
};

export function ContextMenu() {
  const collage = useCollage();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onContext = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("input, textarea, select")) return;
      const host = target.closest<HTMLElement>("[data-menu]");
      if (!host) return;
      event.preventDefault();
      setMenu({
        x: event.clientX,
        y: event.clientY,
        kind: host.dataset.menu ?? "canvas",
        photoId: host.dataset.photoId ?? "",
        groupId: host.dataset.groupId ?? "",
      });
      setPoint({ x: event.clientX, y: event.clientY });
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(null);
    };
    const onScroll = () => setMenu(null);
    window.addEventListener("contextmenu", onContext);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!menu || !panel) return;
    const rect = panel.getBoundingClientRect();
    setPoint({
      x: Math.max(8, Math.min(menu.x, window.innerWidth - rect.width - 8)),
      y: Math.max(8, Math.min(menu.y, window.innerHeight - rect.height - 8)),
    });
  }, [menu]);

  if (!menu) return null;

  const close = () => setMenu(null);
  const group = collage.groups.find((item) => item.id === menu.groupId);
  const photo = collage.groups.flatMap((item) => item.photos).find((item) => item.id === menu.photoId);
  const groupIndex = collage.groups.findIndex((item) => item.id === menu.groupId);
  const items: Item[] = [];
  let title = "Feuille";
  let kicker = "AnyCollage";

  if (menu.kind === "photo" && photo && group) {
    title = photo.name;
    kicker = group.name;
    items.push({
      id: "show",
      label: "Voir sur la feuille",
      onSelect: () => {
        const page = collage.sheets.findIndex((sheet) => sheet.cells.some((cell) => cell.photo.id === photo.id));
        if (page >= 0) collage.setPage(page);
        collage.setShowAll(false);
        collage.setSelectedId(photo.id);
        collage.selectGroup(group.id);
      },
    });
    items.push({
      id: "replace",
      label: "Remplacer la photo",
      onSelect: () => collage.openReplace(photo.id),
    });
    for (const target of collage.groups) {
      if (target.id === group.id) continue;
      items.push({
        id: `move-${target.id}`,
        label: `Envoyer vers ${target.name}`,
        onSelect: () => collage.transferPhoto(photo.id, target.id),
      });
    }
    items.push({
      id: "delete",
      label: "Retirer la photo",
      danger: true,
      onSelect: () => collage.removePhoto(photo.id),
    });
  } else if (menu.kind === "group" && group) {
    title = group.name;
    kicker = "Groupe";
    items.push({
      id: "rename",
      label: "Renommer",
      onSelect: () => {
        const input = document.querySelector<HTMLInputElement>(`input[data-group-name="${group.id}"]`);
        input?.focus();
        input?.select();
      },
    });
    items.push({
      id: "up",
      label: "Monter",
      disabled: groupIndex <= 0,
      onSelect: () => collage.moveGroup(group.id, groupIndex - 1),
    });
    items.push({
      id: "down",
      label: "Descendre",
      disabled: groupIndex < 0 || groupIndex >= collage.groups.length - 1,
      onSelect: () => collage.moveGroup(group.id, groupIndex + 1),
    });
    items.push({
      id: "add",
      label: "Ajouter des photos",
      onSelect: () => {
        collage.selectGroup(group.id);
        collage.openImporter();
      },
    });
    items.push({
      id: "delete",
      label: "Supprimer le groupe",
      danger: true,
      disabled: collage.groups.length <= 1,
      onSelect: () => collage.deleteGroup(group.id),
    });
  } else {
    items.push({
      id: "import",
      label: "Importer des photos",
      onSelect: () => collage.openImporter(),
    });
    items.push({
      id: "group",
      label: "Ajouter un groupe",
      onSelect: () => collage.createGroup(),
    });
    const ready = collage.groups.some((item) => item.photos.length > 0);
    items.push({
      id: "print",
      label: "Imprimer",
      disabled: !ready || collage.printing,
      onSelect: () => void collage.print(),
    });
    items.push({
      id: "pdf",
      label: "Exporter en PDF",
      disabled: !ready || collage.exporting,
      onSelect: () => void collage.exportPdf(),
    });
  }

  return (
    <div className="context-layer" onClick={close} onContextMenu={(event) => event.preventDefault()}>
      <div
        ref={panelRef}
        className="context-menu"
        role="menu"
        style={{ left: point.x, top: point.y }}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="context-kicker">{kicker}</p>
        <p className="context-title">{title}</p>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            className={item.danger ? "is-danger" : undefined}
            disabled={item.disabled}
            onClick={() => {
              item.onSelect();
              close();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
