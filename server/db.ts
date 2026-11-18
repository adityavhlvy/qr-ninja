import { neon } from "@neondatabase/serverless";

let cached: ReturnType<typeof neon> | undefined;

/** Lazily creates the HTTP client so a missing env var fails at request time, not import time. */
export function db(): ReturnType<typeof neon> {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  cached = neon(url);
  return cached;
}
