import { useCollage } from "../state";
import type { BorderStyle, ObjectFitMode, Orientation, RadiusStyle } from "../types";

const MARGINS = [0, 2, 5, 10];

export function SettingsPanel() {
  const { state, setOrientation, setMargin, setGap, setBackground, setBorder, setRadius, setFit } = useCollage();
  const customMargin = !MARGINS.includes(state.marginMm);

  return (
    <section className="panel settings" aria-label="Réglages du collage">
      <header className="panel-head">
        <h2>Réglages</h2>
      </header>

      <fieldset>
        <legend>Orientation</legend>
        <div className="choices">
          <Choice
            name="orientation"
            label="Portrait"
            checked={state.orientation === "portrait"}
            onChange={() => setOrientation("portrait" satisfies Orientation)}
          />
          <Choice
            name="orientation"
            label="Paysage"
            checked={state.orientation === "landscape"}
            onChange={() => setOrientation("landscape")}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend>Marges</legend>
        <div className="choices">
          {MARGINS.map((margin) => (
            <Choice
              key={margin}
              name="margin"
              label={`${margin} mm`}
              checked={state.marginMm === margin}
              onChange={() => setMargin(margin)}
            />
          ))}
          <label className={customMargin ? "choice is-on" : "choice"}>
            <input
              type="radio"
              name="margin"
              checked={customMargin}
              onChange={() => {
                if (!customMargin) setMargin(8);
              }}
            />
            Personnalisée
          </label>
        </div>
        <label className="measure">
          Valeur
          <input
            type="number"
            min={0}
            max={40}
            step={0.5}
            value={state.marginMm}
            aria-label="Marge personnalisée en millimètres"
            onChange={(event) => setMargin(Number(event.target.value))}
          />
          mm
        </label>
      </fieldset>

      <fieldset>
        <legend>Espacement : {state.gapMm} mm</legend>
        <label className="measure">
          <input
            type="range"
            min={0}
            max={15}
            step={0.5}
            value={Math.min(15, state.gapMm)}
            aria-label="Espacement entre les photos"
            onChange={(event) => setGap(Number(event.target.value))}
          />
          <input
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={state.gapMm}
            aria-label="Espacement en millimètres"
            onChange={(event) => setGap(Number(event.target.value))}
          />
          mm
        </label>
      </fieldset>

      <fieldset>
        <legend>Photos</legend>
        <div className="choices">
          <Choice name="fit" label="Remplir" checked={state.fit === "cover"} onChange={() => setFit("cover" satisfies ObjectFitMode)} />
          <Choice name="fit" label="Contenir" checked={state.fit === "contain"} onChange={() => setFit("contain")} />
        </div>
        <p className="hint">
          {state.fit === "cover"
            ? "La photo remplit la case. Elle peut être légèrement recadrée, sans déformation."
            : "La photo entière reste visible dans la case, sans déformation."}
        </p>
      </fieldset>

      <fieldset>
        <legend>Bordures</legend>
        <div className="choices">
          {(
            [
              ["none", "Aucune"],
              ["thin", "Fine"],
              ["medium", "Moyenne"],
              ["thick", "Épaisse"],
            ] as const
          ).map(([value, label]) => (
            <Choice
              key={value}
              name="border"
              label={label}
              checked={state.border === value}
              onChange={() => setBorder(value satisfies BorderStyle)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Coins</legend>
        <div className="choices">
          {(
            [
              ["square", "Carrés"],
              ["slight", "Légèrement arrondis"],
              ["round", "Arrondis"],
            ] as const
          ).map(([value, label]) => (
            <Choice
              key={value}
              name="radius"
              label={label}
              checked={state.radius === value}
              onChange={() => setRadius(value satisfies RadiusStyle)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Arrière-plan</legend>
        <div className="choices colors">
          <Choice name="bg" label="Blanc" checked={state.background === "#ffffff"} onChange={() => setBackground("#ffffff")} />
          <Choice name="bg" label="Noir" checked={state.background === "#111111"} onChange={() => setBackground("#111111")} />
        </div>
        <label className="measure">
          Couleur personnalisée
          <input
            type="color"
            value={state.background}
            aria-label="Couleur d'arrière-plan personnalisée"
            onChange={(event) => setBackground(event.target.value)}
          />
        </label>
      </fieldset>
    </section>
  );
}

function Choice({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className={checked ? "choice is-on" : "choice"}>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
