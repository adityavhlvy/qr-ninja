import { useRef, useState, type ChangeEvent } from "react";
import { CONTRAST_WARN, DOT_STYLES, ECC_LEVELS, MAX_MARGIN, MAX_SIZE, MIN_MARGIN, MIN_SIZE } from "../../shared/types";
import type { Ecc, QrStyle } from "../../shared/types";
import { contrastRatio, isHexColor } from "../../shared/validate";
import { buttonClass, chipClass, panelClass, rowClass } from "./controls";

interface Props {
  style: QrStyle;
  onChange: (patch: Partial<QrStyle>) => void;
  modules: number | null;
}

const ECC_HINT: Record<Ecc, string> = {
  L: "7% recovery",
  M: "15% recovery",
  Q: "25% recovery",
  H: "30% recovery, best behind a logo",
};

const fileTooLarge = "Logos must be under 200 KB.";

export function StylePanel({ style, onChange, modules }: Props) {
  const [logoError, setLogoError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const contrast = contrastRatio(style.fore, style.back);
  const accentContrast = style.accent ? contrastRatio(style.accent, style.back) : null;
  const lowContrast = contrast < CONTRAST_WARN || (accentContrast !== null && accentContrast < CONTRAST_WARN);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setLogoError(null);
    if (!file.type.startsWith("image/")) {
      setLogoError("Pick a PNG, JPEG, WebP, or SVG file.");
      return;
    }
    if (file.size > 200_000) {
      setLogoError(fileTooLarge);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange({ logo: reader.result });
      else setLogoError("That file could not be read.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className={`${panelClass} p-5 md:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="label">Style</h2>
        <button type="button" className={buttonClass("ghost")} onClick={() => onChange({ dotStyle: "square", fore: "#101317", back: "#ffffff", accent: null, margin: 4, logo: null, ecc: "M" })}>
          Reset
        </button>
      </div>

      <div className="mt-4 divide-y divide-line border-t border-line">
        <div className="py-3">
          <p className="label mb-2">Modules</p>
          <div className="flex flex-wrap gap-2">
            {DOT_STYLES.map((value) => (
              <button key={value} type="button" aria-pressed={style.dotStyle === value} className={chipClass(style.dotStyle === value)} onClick={() => onChange({ dotStyle: value })}>
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="py-3">
          <p className="label mb-2">Error correction</p>
          <div className="flex flex-wrap gap-2">
            {ECC_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                title={ECC_HINT[level]}
                aria-pressed={style.ecc === level}
                className={chipClass(style.ecc === level)}
                onClick={() => onChange({ ecc: level })}
              >
                {level}
              </button>
            ))}
          </div>
          <p className="mt-2 font-mono text-xs text-mute">{ECC_HINT[style.ecc]}</p>
        </div>

        <div className={rowClass}>
          <label htmlFor="qr-size" className="label">
            Size
          </label>
          <span className="font-mono text-xs">{style.size} px</span>
        </div>
        <div className="pb-4">
          <input
            id="qr-size"
            type="range"
            min={MIN_SIZE}
            max={MAX_SIZE}
            step={64}
            value={style.size}
            className="w-full accent-[var(--sea)]"
            onChange={(event) => onChange({ size: Number(event.target.value) })}
          />
        </div>

        <div className={rowClass}>
          <label htmlFor="qr-margin" className="label">
            Quiet zone
          </label>
          <span className="font-mono text-xs">{style.margin} modules</span>
        </div>
        <div className="pb-4">
          <input
            id="qr-margin"
            type="range"
            min={MIN_MARGIN}
            max={MAX_MARGIN}
            step={1}
            value={style.margin}
            className="w-full accent-[var(--sea)]"
            onChange={(event) => onChange({ margin: Number(event.target.value) })}
          />
          {style.margin < 4 ? <p className="mt-2 text-xs text-mute">Below 4 modules scanners lose the quiet edge.</p> : null}
        </div>

        <div className="grid gap-3 py-3 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <input
              aria-label="Foreground colour"
              type="color"
              value={style.fore}
              className="h-11 w-14 border border-line bg-paper p-1"
              onChange={(event) => onChange({ fore: isHexColor(event.target.value) ? event.target.value : style.fore })}
            />
            <div>
              <p className="label">Foreground</p>
              <p className="font-mono text-xs">{style.fore}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              aria-label="Background colour"
              type="color"
              value={style.back}
              className="h-11 w-14 border border-line bg-paper p-1"
              onChange={(event) => onChange({ back: isHexColor(event.target.value) ? event.target.value : style.back })}
            />
            <div>
              <p className="label">Background</p>
              <p className="font-mono text-xs">{style.back}</p>
            </div>
          </div>
        </div>

        <div className={rowClass}>
          <span className="label">Gradient</span>
          {style.accent ? (
            <div className="flex items-center gap-3">
              <input
                aria-label="Gradient end colour"
                type="color"
                value={style.accent}
                className="h-9 w-12 border border-line bg-paper p-1"
                onChange={(event) => onChange({ accent: isHexColor(event.target.value) ? event.target.value : style.accent })}
              />
              <button type="button" className={buttonClass("ghost")} onClick={() => onChange({ accent: null })}>
                Remove
              </button>
            </div>
          ) : (
            <button type="button" className={buttonClass("outline")} onClick={() => onChange({ accent: "#1f3fd1" })}>
              Add gradient
            </button>
          )}
        </div>

        <div className={rowClass}>
          <div>
            <span className="label">Centre logo</span>
            <p className="mt-1 text-xs text-mute">{style.logo ? "Covering 22% of the middle." : "PNG, WebP, or SVG under 200 KB."}</p>
          </div>
          <div className="flex gap-2">
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={onFile} />
            <button type="button" className={buttonClass("outline")} onClick={() => inputRef.current?.click()}>
              {style.logo ? "Replace" : "Upload"}
            </button>
            {style.logo ? (
              <button type="button" className={buttonClass("ghost")} onClick={() => onChange({ logo: null })}>
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {logoError ? (
        <p role="alert" className="border-l-2 border-sea pl-3 text-sm">
          {logoError}
        </p>
      ) : null}

      {lowContrast ? (
        <p className="mt-4 border-l-2 border-sea pl-3 text-sm">
          Contrast is {contrast.toFixed(1)}:1. Cheap scanners need at least {CONTRAST_WARN}:1 between the code and its background.
        </p>
      ) : null}

      {style.logo && style.ecc !== "H" ? (
        <p className="mt-2 border-l-2 border-sea pl-3 text-sm">With a centre logo, set error correction to H to keep the damaged area recoverable.</p>
      ) : null}

      {modules !== null ? <p className="mt-4 font-mono text-xs text-mute">{modules} x {modules} modules</p> : null}
    </section>
  );
}
