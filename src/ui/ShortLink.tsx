import { useEffect, useState, type FormEvent } from "react";
import { useCopy } from "../lib/qrImage";
import { buttonClass, fieldClass, panelClass } from "./controls";

interface Props {
  /** The current payload when it is a usable web address. */
  suggestion: string;
  onUse: (url: string) => void;
}

// Set at build time when the app is proxied under the portfolio.
const API_PATH = `${(import.meta.env.PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "")}/api/links`;

interface Created {
  slug: string;
  url: string;
}

export function ShortLink({ suggestion, onUse }: Props) {
  const [url, setUrl] = useState(suggestion);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const { state, copy } = useCopy();

  // Fill the field once the QR payload becomes a usable link, without
  // overwriting something the user already typed.
  useEffect(() => {
    setUrl((current) => (current === "" ? suggestion : current));
  }, [suggestion]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: url }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Could not create the link.");
      setCreated(data as Created);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${panelClass} mt-4 p-5 md:p-6`} aria-label="Short link">
      <h2 className="label">Short link</h2>
      <p className="mt-2 text-sm text-mute">A stable address on this domain, with a scan count kept in the database. Links last 180 days.</p>

      <form className="mt-4 grid gap-2" onSubmit={submit}>
        <label htmlFor="short-target" className="sr-only">
          Address to shorten
        </label>
        <input
          id="short-target"
          className={fieldClass}
          type="url"
          inputMode="url"
          placeholder="https://example.com/a/long/path"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={buttonClass("outline")} disabled={busy || url.trim() === ""}>
            {busy ? "Working..." : "Shorten"}
          </button>
          {suggestion && suggestion !== url ? (
            <button type="button" className={buttonClass("ghost")} onClick={() => setUrl(suggestion)}>
              Use the current link
            </button>
          ) : null}
        </div>
      </form>

      {error ? (
        <p role="alert" className="mt-3 border-l-2 border-sea pl-3 text-sm">
          {error}
        </p>
      ) : null}

      {created ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="font-mono text-xs break-all">{created.url}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={buttonClass("outline")} onClick={() => copy(created.url)}>
              {state === "copied" ? "Copied" : "Copy link"}
            </button>
            <button type="button" className={buttonClass("ghost")} onClick={() => onUse(created.url)}>
              Put it in the QR
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
