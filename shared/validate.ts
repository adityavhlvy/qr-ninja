export function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

function channel(hex: string, index: number): number {
  const pair = hex.length === 4 ? hex[1 + index].repeat(2) : hex.slice(1 + index * 2, 3 + index * 2);
  const value = Number.parseInt(pair, 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
}

/** WCAG contrast ratio, 1 to 21. Below 4.5 is a real scan risk. */
export function contrastRatio(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function isPrivateHost(host: string): boolean {
  const name = host.toLowerCase();
  if (name === "localhost" || name.endsWith(".localhost")) return true;
  if (name.endsWith(".local") || name.endsWith(".internal")) return true;
  if (name === "::1" || name.startsWith("fc") || name.startsWith("fd") || name.startsWith("fe80")) return true;

  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(name);
  if (!match) return false;

  const a = Number(match[1]);
  const b = Number(match[2]);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

export type TargetCheck = { ok: true; url: string } | { ok: false; error: string };

/** Short links are an HTTP redirect, so only public http(s) targets pass. */
export function validateTarget(raw: string): TargetCheck {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Paste a web address first." };
  if (value.length > 2048) return { ok: false, error: "That address is longer than 2048 characters." };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: "That is not a complete URL. Include https://" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http and https links can be shortened." };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "Remove the username and password from the address." };
  }
  if (isPrivateHost(parsed.hostname)) {
    return { ok: false, error: "Private and local addresses cannot be shortened." };
  }

  return { ok: true, url: parsed.toString() };
}

export function isWebUrl(raw: string): boolean {
  return validateTarget(raw).ok;
}
