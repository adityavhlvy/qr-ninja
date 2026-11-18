import type { Entry } from "../lib/history";
import { buttonClass, panelClass } from "./controls";

interface Props {
  entries: Entry[];
  onRestore: (entry: Entry) => void;
  onClear: () => void;
}

export function History({ entries, onRestore, onClear }: Props) {
  if (entries.length === 0) return null;

  return (
    <section className={`${panelClass} mt-4 p-5 md:p-6`} aria-label="Recent codes">
      <div className="flex items-center justify-between gap-3">
        <h2 className="label">Recent</h2>
        <button type="button" className={buttonClass("ghost")} onClick={onClear}>
          Clear
        </button>
      </div>
      <ul className="mt-3 divide-y divide-line border-t border-line">
        {entries.map((entry) => (
          <li key={`${entry.at}-${entry.label}`}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 py-3 text-left text-sm hover:text-sea"
              onClick={() => onRestore(entry)}
            >
              <span className="min-w-0 truncate">{entry.label}</span>
              <span className="shrink-0 font-mono text-xs text-mute">
                {new Date(entry.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-mute">Saved in this browser only.</p>
    </section>
  );
}
