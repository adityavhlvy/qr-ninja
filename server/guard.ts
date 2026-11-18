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

/** Link creation is only called by this app's own page, so require its origin. */
export function sameOrigin(req: VercelRequest): boolean {
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}
