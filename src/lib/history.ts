import type { PresetId } from "../../shared/payloads";

export interface Entry {
  preset: PresetId;
  values: Record<string, string>;
  label: string;
  at: number;
}

const KEY = "qr-ninja:history:v1";
const LIMIT = 8;

export function readHistory(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry).slice(0, LIMIT);
  } catch {
    return [];
  }
}

function isEntry(value: unknown): value is Entry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<Entry>;
  return typeof entry.preset === "string" && typeof entry.label === "string" && typeof entry.values === "object" && entry.values !== null;
}

function write(entries: Entry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    // Storage is optional.
  }
}

export function addHistory(entries: Entry[], entry: Entry): Entry[] {
  const next = [entry, ...entries].slice(0, LIMIT);
  write(next);
  return next;
}

export function clearHistory(): Entry[] {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Storage is optional.
  }
  return [];
}
