import { useState } from "react";
import type { QrStyle } from "../../shared/types";
import { download, svgBlob, svgToPng, useCopy } from "../lib/qrImage";
import { buttonClass, panelClass } from "./controls";

interface Props {
  svg: string | null;
  url: string | null;
  payload: string;
  style: QrStyle;
  version: number | null;
  modules: number | null;
  message: string | null;
  onRemember: () => void;
}

export function Preview({ svg, url, payload, style, version, modules, message, onRemember }: Props) {
  const [busy, setBusy] = useState(false);
  const [pngError, setPngError] = useState<string | null>(null);
  const { state, copy } = useCopy();

  const saveSvg = () => {
    if (!svg) return;
    download(svgBlob(svg), "qr-code.svg");
    onRemember();
  };

  const savePng = async () => {
    if (!svg) return;
    setBusy(true);
    setPngError(null);
    try {
      download(await svgToPng(svg, style.size), "qr-code.png");
      onRemember();
    } catch {
      setPngError("Could not build the PNG. The SVG download still works.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${panelClass} p-5 md:p-6`} aria-label="QR preview">
      <div className="qr-plate p-3">
        {url ? (
          <img src={url} alt="QR code preview" width={style.size} height={style.size} className="block h-auto w-full" />
        ) : (
          <div className="grid aspect-square place-items-center bg-sunk px-6 text-center text-sm text-mute">
            {message ?? "Fill the fields to see the code."}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" className={buttonClass("primary")} onClick={savePng} disabled={!svg || busy}>
          {busy ? "Building..." : "Download PNG"}
        </button>
        <button type="button" className={buttonClass("outline")} onClick={saveSvg} disabled={!svg}>
          Download SVG
        </button>
      </div>

      <button type="button" className={`${buttonClass("ghost")} mt-2 w-full justify-start`} onClick={() => copy(payload)} disabled={!payload}>
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed, select the text instead" : "Copy the payload"}
      </button>

      {pngError ? (
        <p role="alert" className="mt-3 border-l-2 border-sea pl-3 text-sm">
          {pngError}
        </p>
      ) : null}

      {svg ? (
        <dl className="mt-4 grid grid-cols-2 gap-y-2 border-t border-line pt-4 font-mono text-xs text-mute">
          <dt>Version</dt>
          <dd className="text-right text-ink">{version}</dd>
          <dt>Modules</dt>
          <dd className="text-right text-ink">{modules}</dd>
          <dt>Correction</dt>
          <dd className="text-right text-ink">{style.ecc}</dd>
          <dt>Payload</dt>
          <dd className="text-right text-ink">{new Blob([payload]).size} B</dd>
        </dl>
      ) : null}
    </section>
  );
}
