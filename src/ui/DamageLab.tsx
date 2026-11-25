import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Footer, Header } from "@adityavhlvy/design-system";
import type { RenderLink } from "@adityavhlvy/design-system";
import { analyse, buildGrid, drawToCanvas, emptyMask, fold, paint, readPixels, ring, sprinkle, sticker } from "../../shared/damage";
import type { DamageReport, Grid, Mask } from "../../shared/damage";
import { decodePixels } from "../../shared/decoder";
import { ECC_LEVELS } from "../../shared/types";
import type { Ecc } from "../../shared/types";
import { channels as siteChannels, profile as siteProfile } from "../site";
import { buttonClass, chipClass, fieldClass, panelClass } from "./controls";

const SITE_ORIGIN = (import.meta.env.PUBLIC_BASE_URL ?? "https://adityavhlvy.vercel.app").replace(/\/+$/, "");

const renderLink: RenderLink = ({ to, className, children, onClick, ...rest }) => (
  <a href={`${SITE_ORIGIN}${to}`} className={className} onClick={onClick} {...rest}>
    {children}
  </a>
);

const openSearch = () => window.location.assign(`${SITE_ORIGIN}/?palette=open`);

const MODULE_PX = 8;
const DEFAULT_TEXT = "https://adityavhlvy.vercel.app";

type Tool = "brush" | "erase" | "sticker" | "fold" | "ring" | "sprinkle";

const TOOLS: Array<{ id: Tool; label: string; hint: string }> = [
  { id: "brush", label: "Brush", hint: "Drag to damage. Every module you touch is one the scanner loses." },
  { id: "erase", label: "Erase", hint: "Drag to repair. The mask is the only thing that changes." },
  { id: "sticker", label: "Sticker", hint: "Click to drop a square sticker, the way a logo covers the centre." },
  { id: "fold", label: "Fold", hint: "Click to crease the sheet corner to corner." },
  { id: "ring", label: "Coffee ring", hint: "Click to leave a cup ring. The centre stays readable." },
  { id: "sprinkle", label: "Sprinkle", hint: "Click to scatter random damage. Seeded, so it repeats." },
];

interface Decoded {
  ok: boolean;
  text: string | null;
}

export function DamageLab() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [ecc, setEcc] = useState<Ecc>("M");
  const [tool, setTool] = useState<Tool>("brush");
  const [radius, setRadius] = useState(2);
  const [mask, setMask] = useState<Mask>(() => emptyMask(1));
  const [seed, setSeed] = useState(1);
  const [decoded, setDecoded] = useState<Decoded>({ ok: true, text: DEFAULT_TEXT });
  const [showDamage, setShowDamage] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const painting = useRef(false);

  const grid = useMemo<Grid | null>(() => {
    if (!text.trim()) return null;
    try {
      return buildGrid(text, ecc, 4);
    } catch {
      return null;
    }
  }, [text, ecc]);

  // A new grid invalidates the mask, because the module count changed.
  useEffect(() => {
    if (!grid) return;
    setMask(emptyMask(grid.size));
  }, [grid]);

  const report = useMemo<DamageReport | null>(() => (grid ? analyse(grid, mask) : null), [grid, mask]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;

    drawToCanvas(canvas, grid, mask, {
      modulePx: MODULE_PX,
      fore: "#101317",
      back: "#ffffff",
      damage: "#e5484d",
      showDamage,
    });

    const pixels = readPixels(canvas);
    const result = decodePixels(pixels, canvas.width, canvas.height);
    setDecoded({ ok: result?.text === text, text: result?.text ?? null });
  }, [grid, mask, showDamage, text]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const toModule = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return null;
    const rect = canvas.getBoundingClientRect();
    const scale = grid.size / rect.width;
    return {
      x: (event.clientX - rect.left) * scale,
      y: (event.clientY - rect.top) * scale,
    };
  };

  const apply = (x: number, y: number) => {
    if (!grid) return;
    setMask((current) => {
      if (tool === "brush") return paint(current, grid.size, x, y, radius, "damage");
      if (tool === "erase") return paint(current, grid.size, x, y, radius, "erase");
      return current;
    });
  };

  const onClick = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!grid) return;
    const point = toModule(event);
    if (!point) return;

    if (tool === "sticker") {
      const size = Math.max(2, Math.round(radius * 2));
      setMask((current) => sticker(current, grid.size, Math.round(point.x - size / 2), Math.round(point.y - size / 2), size, size));
      return;
    }
    if (tool === "fold") {
      setMask((current) => fold(current, grid.size, Math.max(1, radius), Math.round(point.x - point.y)));
      return;
    }
    if (tool === "ring") {
      setMask((current) => ring(current, grid.size, point.x, point.y, radius, radius + 2));
      return;
    }
    if (tool === "sprinkle") {
      const next = seed + 1;
      setSeed(next);
      setMask((current) => sprinkle(current, grid.size, Math.round(radius * 12), next));
      return;
    }
    apply(point.x, point.y);
  };

  const reset = () => {
    if (grid) setMask(emptyMask(grid.size));
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "qr-damaged.png";
    link.click();
  };

  const used = report ? Math.min(1, report.used) : 0;
  const over = report?.overBudget === true || report?.fatal === true;

  return (
    <>
      <Header activePath="/tools/qr" onSearch={openSearch} renderLink={renderLink} />

      <main className="mx-auto max-w-[1440px] px-5 pt-16 pb-24 md:px-10">
        <section className="pt-12 pb-10 md:pt-16">
          <p className="label">Tool</p>
          <h1 className="display mt-4 max-w-[18ch] text-[clamp(2.6rem,6vw,5rem)]">Break it until it stops.</h1>
          <p className="mt-5 max-w-[62ch] text-lg text-mute">
            Damage a QR code and watch the error correction budget drain. The number is not a guess: every stroke is
            re-decoded in this browser, and the report separates protected modules from the function patterns that no
            level can save.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-10">
          <div className="grid gap-4">
            <section className={`${panelClass} p-5 md:p-6`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="label">Payload</h2>
                <span className="font-mono text-xs text-mute">{text.length} characters</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  className={fieldClass}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="https://example.com"
                  spellCheck={false}
                />
                <div className="flex gap-1" role="group" aria-label="Error correction level">
                  {ECC_LEVELS.map((level) => (
                    <button key={level} type="button" aria-pressed={level === ecc} className={chipClass(level === ecc)} onClick={() => setEcc(level)}>
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className={`${panelClass} p-5 md:p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="label">Damage</h2>
                <div className="flex flex-wrap gap-1" role="group" aria-label="Damage tool">
                  {TOOLS.map((item) => (
                    <button key={item.id} type="button" aria-pressed={item.id === tool} className={chipClass(item.id === tool)} onClick={() => setTool(item.id)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-3 text-sm text-mute">{TOOLS.find((item) => item.id === tool)?.hint}</p>

              <label className="mt-4 grid gap-2">
                <span className="flex items-center justify-between text-sm text-mute">
                  <span>Size</span>
                  <span className="font-mono text-xs text-ink">{radius} modules</span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={8}
                  step={1}
                  value={radius}
                  onChange={(event) => setRadius(Number(event.target.value))}
                  className="w-full accent-[var(--sea)]"
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" className={buttonClass("outline")} onClick={reset}>
                  Repair all
                </button>
                <button type="button" className={buttonClass("ghost")} onClick={download}>
                  Download PNG
                </button>
                <label className="ml-auto flex items-center gap-2 text-sm text-mute">
                  <input type="checkbox" checked={showDamage} onChange={(event) => setShowDamage(event.target.checked)} />
                  Show damage
                </label>
              </div>
            </section>

            <section className={`${panelClass} p-5 md:p-6`}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="label">Code</h2>
                <span className={`font-mono text-xs ${decoded.ok ? "text-ink" : "text-[#e5484d]"}`}>
                  {decoded.ok ? "decodes" : "does not decode"}
                </span>
              </div>

              <div className="qr-plate mt-4 p-3">
                <canvas
                  ref={canvasRef}
                  className="block h-auto w-full cursor-crosshair touch-none"
                  onPointerDown={(event) => {
                    painting.current = true;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    onClick(event);
                  }}
                  onPointerMove={(event) => {
                    if (!painting.current) return;
                    if (tool !== "brush" && tool !== "erase") return;
                    const point = toModule(event);
                    if (point) apply(point.x, point.y);
                  }}
                  onPointerUp={() => {
                    painting.current = false;
                  }}
                  onPointerLeave={() => {
                    painting.current = false;
                  }}
                />
              </div>

              {decoded.text && !decoded.ok ? (
                <p className="mt-3 border-l-2 border-[#e5484d] pl-3 text-sm">
                  The scanner reads <span className="font-mono text-xs">{decoded.text.slice(0, 60)}</span> instead. That is
                  worse than failing: a wrong code is a wrong destination.
                </p>
              ) : null}
            </section>
          </div>

          <aside className="grid gap-4 lg:sticky lg:top-24">
            <section className={`${panelClass} p-5 md:p-6`} aria-label="Error correction budget">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="label">Budget</h2>
                <span className="font-mono text-xs text-mute">level {ecc}</span>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline justify-between font-mono text-xs">
                  <span className="text-mute">used</span>
                  <span className={over ? "text-[#e5484d]" : "text-ink"}>
                    {report ? `${(report.ratio * 100).toFixed(1)}%` : "0%"} / {report ? `${(report.budget * 100).toFixed(0)}%` : "—"}
                  </span>
                </div>
                <div className="mt-2 h-3 w-full bg-sunk" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(used * 100)}>
                  <div
                    className={`h-full transition-[width] duration-150 ${over ? "bg-[#e5484d]" : "bg-sea"}`}
                    style={{ width: `${used * 100}%` }}
                  />
                </div>
              </div>

              {report ? (
                <dl className="mt-5 grid grid-cols-2 gap-y-2 font-mono text-xs">
                  <dt className="text-mute">damaged</dt>
                  <dd className="text-right">{report.damaged}</dd>
                  <dt className="text-mute">protected</dt>
                  <dd className="text-right">{report.damagedProtected}</dd>
                  <dt className="text-mute">unprotected</dt>
                  <dd className={`text-right ${report.damagedUnprotected > 0 ? "text-[#e5484d]" : ""}`}>
                    {report.damagedUnprotected}
                  </dd>
                  <dt className="text-mute">of total</dt>
                  <dd className="text-right">{report.total}</dd>
                </dl>
              ) : null}

              {report?.verdict ? (
                <p className={`mt-4 border-l-2 pl-3 text-sm ${over ? "border-[#e5484d]" : "border-sea"}`}>{report.verdict}</p>
              ) : report && report.damaged > 0 ? (
                <p className="mt-4 border-l-2 border-sea pl-3 text-sm">
                  Still inside the budget. {report.damagedProtected} protected modules lost, and the level can recover them.
                </p>
              ) : (
                <p className="mt-4 text-sm text-mute">Intact. Nothing to recover yet.</p>
              )}
            </section>

            <section className={`${panelClass} p-5 md:p-6`} aria-label="Damage by module type">
              <h2 className="label mb-3">Where the damage is</h2>
              {report ? (
                <ul className="grid gap-2">
                  {(
                    [
                      ["data", report.breakdown.data, "protected"],
                      ["position", report.breakdown.position, "finder"],
                      ["timing", report.breakdown.timing, "timing"],
                      ["alignment", report.breakdown.alignment, "alignment"],
                      ["function", report.breakdown.function, "other"],
                    ] as const
                  ).map(([key, value, note]) => (
                    <li key={key} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 font-mono text-xs">
                      <span className="text-mute">{key}</span>
                      <span className="text-[10px] text-mute">{note}</span>
                      <span className={value > 0 && key !== "data" ? "text-[#e5484d]" : ""}>{value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-mute">Enter a payload first.</p>
              )}
              <p className="mt-4 border-t border-line pt-3 text-xs text-mute">
                Data modules are protected by error correction. Function patterns are not. That is why a fold is worse
                than a smudge.
              </p>
            </section>

            <section className={`${panelClass} p-5 md:p-6`} aria-label="What this teaches">
              <h2 className="label mb-2">Try this</h2>
              <ol className="grid gap-2 text-sm text-mute">
                <li>1. Set level L, then brush the centre until it stops decoding.</li>
                <li>2. Switch to H and do the same. The budget triples.</li>
                <li>3. Now damage a corner. No level saves it.</li>
                <li>4. Drop a sticker in the middle. That is what a logo costs.</li>
              </ol>
            </section>
          </aside>
        </div>
      </main>

      <Footer profile={siteProfile} channels={siteChannels} renderLink={renderLink} />
    </>
  );
}
