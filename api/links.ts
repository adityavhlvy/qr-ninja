import type { VercelRequest, VercelResponse } from "@vercel/node";
import { countRecent, createLink } from "../server/links.js";
import { hashIp, sameOrigin } from "../server/guard.js";
import { validateTarget } from "../shared/validate.js";

const PER_HOUR = 20;

function baseUrl(req: VercelRequest): string {
  // Behind the portfolio proxy the request host is the deployment, so the
  // public origin is configured explicitly.
  const configured = process.env.PUBLIC_BASE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader) ?? "https";
  return `${proto}://${req.headers.host ?? "localhost:3001"}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "This endpoint only accepts requests from the app." });

  const body = typeof req.body === "object" && req.body !== null ? (req.body as { target?: unknown }) : {};
  const raw = typeof body.target === "string" ? body.target : "";

  const check = validateTarget(raw);
  if (!check.ok) return res.status(400).json({ error: check.error });

  try {
    const ipHash = hashIp(req);
    if (ipHash && (await countRecent(ipHash)) >= PER_HOUR) {
      return res.status(429).json({ error: "Too many links from this address. Try again in an hour." });
    }

    const slug = await createLink(check.url, ipHash);
    return res.status(201).json({ slug, url: `${baseUrl(req)}/q/${slug}` });
  } catch (error) {
    console.error("POST /api/links", error);
    const unconfigured = error instanceof Error && error.message.includes("DATABASE_URL");
    return res.status(503).json({ error: unconfigured ? "Link storage is not configured." : "Could not create the link." });
  }
}
