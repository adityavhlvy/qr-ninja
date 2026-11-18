import { db } from "./db";

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const SLUG_LENGTH = 7;
const LINK_DAYS = 180;

export function isSlug(value: string): boolean {
  return /^[a-z0-9]{4,16}$/.test(value);
}

function makeSlug(): string {
  const bytes = new Uint8Array(SLUG_LENGTH);
  crypto.getRandomValues(bytes);
  let slug = "";
  for (const byte of bytes) slug += ALPHABET[byte % ALPHABET.length];
  return slug;
}

/** Retries only on slug collisions. Any other error belongs to the caller. */
export async function createLink(target: string, ipHash: string | null): Promise<string> {
  const sql = db();
  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = makeSlug();
    try {
      await sql`insert into public.links (slug, target, ip_hash, expires_at)
        values (${slug}, ${target}, ${ipHash}, now() + make_interval(days => ${LINK_DAYS}))`;
      return slug;
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
    }
  }
  throw new Error("Could not allocate a unique slug");
}

export async function countRecent(ipHash: string): Promise<number> {
  const sql = db();
  const rows = (await sql`select count(*)::int as n from public.links
    where ip_hash = ${ipHash} and created_at > now() - interval '1 hour'`) as Array<{ n: number }>;
  return rows[0]?.n ?? 0;
}

/**
 * Resolve and count in one statement. Expired links return null, and a link
 * that is not found is not counted.
 */
export async function resolveLink(slug: string): Promise<string | null> {
  const sql = db();
  const rows = (await sql`update public.links set hits = hits + 1
    where slug = ${slug} and (expires_at is null or expires_at > now())
    returning target`) as Array<{ target: string }>;
  return rows[0]?.target ?? null;
}
