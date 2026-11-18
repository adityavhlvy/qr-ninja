import { useDeferredValue, useMemo, useState } from "react";
import { PRESETS, PRESET_BY_ID, buildPayload, initialValues } from "../shared/payloads";
import type { PresetId } from "../shared/payloads";
import { MAX_PAYLOAD } from "../shared/types";
import type { QrStyle } from "../shared/types";
import { DEFAULT_STYLE } from "../shared/types";
import { renderQr } from "../shared/qr";
import { isWebUrl } from "../shared/validate";
import { useTheme } from "./lib/theme";
import { addHistory, clearHistory, readHistory } from "./lib/history";
import type { Entry } from "./lib/history";
import { useSvgUrl } from "./lib/qrImage";
import { History } from "./ui/History";
import { PresetForm } from "./ui/PresetForm";
import { Preview } from "./ui/Preview";
import { ShortLink } from "./ui/ShortLink";
import { StylePanel } from "./ui/StylePanel";
import { buttonClass, chipClass, panelClass } from "./ui/controls";

type Outcome =
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "ok"; svg: string; modules: number; version: number };

function Mark() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" className="shrink-0">
      <rect x="3" y="3" width="10" height="10" fill="currentColor" />
      <rect x="6.5" y="6.5" width="3" height="3" fill="var(--paper)" />
      <rect x="19" y="3" width="10" height="10" fill="currentColor" />
      <rect x="22.5" y="6.5" width="3" height="3" fill="var(--paper)" />
      <rect x="3" y="19" width="10" height="10" fill="currentColor" />
      <rect x="6.5" y="22.5" width="3" height="3" fill="var(--paper)" />
      <rect x="17" y="17" width="4" height="4" fill="var(--sea)" />
      <rect x="23" y="17" width="3" height="3" fill="currentColor" />
      <rect x="17" y="24" width="3" height="3" fill="currentColor" />
      <rect x="24" y="24" width="5" height="5" fill="currentColor" />
    </svg>
  );
}

export default function App() {
  const { theme, toggle } = useTheme();
  const [presetId, setPresetId] = useState<PresetId>("url");
  const [allValues, setAllValues] = useState<Partial<Record<PresetId, Record<string, string>>>>({});
  const [style, setStyle] = useState<QrStyle>(DEFAULT_STYLE);
  const [history, setHistory] = useState<Entry[]>(() => readHistory());

  const preset = PRESET_BY_ID.get(presetId)!;
  const values = { ...initialValues(preset), ...allValues[presetId] };
  const payload = buildPayload(preset, values);
  const fieldError = preset.error?.(values) ?? null;
  const deferred = useDeferredValue(payload);

  const outcome = useMemo<Outcome>(() => {
    if (!deferred.trim()) return { kind: "empty" };
    if (deferred.length > MAX_PAYLOAD) return { kind: "error", message: `Keep the payload under ${MAX_PAYLOAD} characters.` };
    try {
      const rendered = renderQr(deferred, style);
      return { kind: "ok", ...rendered };
    } catch {
      return { kind: "error", message: "This payload is too large for a single QR code." };
    }
  }, [deferred, style]);

  const svg = outcome.kind === "ok" ? outcome.svg : null;
  const imageUrl = useSvgUrl(svg);
  const suggestion = isWebUrl(payload) ? payload : "";
  const dense = payload.length > 800;

  const setValue = (name: string, value: string) =>
    setAllValues((current) => ({
      ...current,
      [presetId]: { ...(current[presetId] ?? {}), [name]: value },
    }));

  const patchStyle = (patch: Partial<QrStyle>) => setStyle((current) => ({ ...current, ...patch }));

  const remember = () => {
    if (!payload) return;
    const first = Object.values(values).map((value) => value.trim()).find(Boolean) ?? payload;
    const label = `${preset.label}: ${first.slice(0, 40)}`;
    setHistory(addHistory(history, { preset: presetId, values, label, at: Date.now() }));
  };

  const restore = (entry: Entry) => {
    setPresetId(entry.preset);
    setAllValues((current) => ({ ...current, [entry.preset]: entry.values }));
  };

  const useShortUrl = (url: string) => {
    setPresetId("url");
    setAllValues((current) => ({ ...current, url: { url } }));
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 md:px-10">
          <a href="/" className="flex items-center gap-3 text-ink">
            <Mark />
            <span className="text-sm font-medium">QR Ninja</span>
          </a>
          <div className="flex items-center gap-1 sm:gap-3">
            <a href="https://adityavhlvy.vercel.app" className="hidden text-sm text-mute transition-colors hover:text-ink sm:inline">
              Portfolio
            </a>
            <button
              type="button"
              className={buttonClass("outline")}
              onClick={toggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 pb-24 md:px-10">
        <section className="pt-12 pb-10 md:pt-16">
          <p className="label">Tool</p>
          <h1 className="display mt-4 max-w-[16ch] text-[clamp(2.6rem,6vw,5rem)]">QR codes that scan.</h1>
          <p className="mt-5 max-w-[62ch] text-lg text-mute">
            Nine payload types, module shapes, colours, a centre logo, and a PNG or SVG download. Everything is generated in this
            browser until you ask for a short link.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-10">
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Payload type">
              {PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === presetId}
                  className={chipClass(item.id === presetId)}
                  onClick={() => setPresetId(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <section className={`${panelClass} p-5 md:p-6`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="label">Content</h2>
                <span className="font-mono text-xs text-mute">{payload.length} characters</span>
              </div>
              <p className="mt-2 text-sm text-mute">{preset.summary}</p>
              <div className="mt-5">
                <PresetForm preset={preset} values={values} onChange={setValue} error={fieldError} />
              </div>
              {dense && !fieldError ? (
                <p className="mt-4 border-l-2 border-sea pl-3 text-sm">
                  This payload is dense. Test the code on two phones before you print it.
                </p>
              ) : null}
            </section>

            <StylePanel style={style} onChange={patchStyle} modules={outcome.kind === "ok" ? outcome.modules : null} />
          </div>

          <aside className="grid gap-0 lg:sticky lg:top-24">
            <Preview
              svg={svg}
              url={imageUrl}
              payload={payload}
              style={style}
              version={outcome.kind === "ok" ? outcome.version : null}
              modules={outcome.kind === "ok" ? outcome.modules : null}
              message={outcome.kind === "error" ? outcome.message : null}
              onRemember={remember}
            />
            <ShortLink suggestion={suggestion} onUse={useShortUrl} />
            <History entries={history} onRestore={restore} onClear={() => setHistory(clearHistory())} />
          </aside>
        </div>

        <section className="mt-16 grid gap-4 border-t border-line pt-10 md:grid-cols-2 md:gap-10">
          <div>
            <h2 className="label">Before you print</h2>
            <p className="mt-3 max-w-[58ch] text-mute">
              Keep the quiet zone at four modules and the contrast high. A logo eats part of the code, so error correction H covers
              it. Print at least 2 cm per side, and test on two phones, not just the one on your desk.
            </p>
          </div>
          <div>
            <h2 className="label">Public API</h2>
            <p className="mt-3 max-w-[58ch] text-mute">
              Every code is also available as SVG: <code className="font-mono text-sm text-ink">/api/qr?text=hello&amp;ecc=M&amp;style=dots</code>.
              Short links resolve at <code className="font-mono text-sm text-ink">/q/&lt;slug&gt;</code>.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-mute md:px-10">
          <p>
            QR Ninja by{" "}
            <a
              href="https://adityavhlvy.vercel.app"
              className="text-ink underline decoration-sea/50 underline-offset-4 hover:decoration-sea"
            >
              Aditya Vahlevy Nugraha
            </a>
          </p>
          <p className="font-mono text-xs">No account, no tracking on generated codes.</p>
        </div>
      </footer>
    </>
  );
}
