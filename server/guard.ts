import { createHash } from "node:crypto";
import type { VercelRequest } from "@vercel/node";

/**
 * Raw IPs are never stored. Without a salt there is no hash, and the rate
 * limit is skipped rather than silently using a shared bucket.
 */
export function hashIp(req: VercelRequest): string | null {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) return null;

  const forwarded = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const raw = first?.split(",")[0]?.trim() || req.socket?.remoteAddress;
  if (!raw) return null;

  return createHash("sha256").update(`${salt}:${raw}`).digest("hex").slice(0, 32);
}

/**
 * Link creation is only called by the app's own page. Through the portfolio
 * proxy the origin host and the function host differ, so the public origin is
 * allowed explicitly.
 */
export function sameOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin;
  if (!origin) return false;

  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }

  const allowed = new Set<string>();
  if (req.headers.host) allowed.add(req.headers.host);

  const forwarded = req.headers["x-forwarded-host"];
  if (typeof forwarded === "string") allowed.add(forwarded.split(",")[0].trim());

  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) {
    try {
      allowed.add(new URL(configured).host);
    } catch {
      // A malformed value is ignored rather than opening the check.
    }
  }

  return allowed.has(host);
}
