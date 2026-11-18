import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isSlug, resolveLink } from "../../server/links.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).send("Method not allowed");

  const raw = req.query.slug;
  const fromQuery = Array.isArray(raw) ? raw[0] : raw;
  const fromPath = new URL(req.url ?? "/", "http://local").pathname.split("/").filter(Boolean).pop() ?? "";
  const slug = fromQuery || fromPath;

  if (!isSlug(slug)) return res.status(404).send("Not found");

  try {
    const target = await resolveLink(slug);
    if (!target) return res.status(404).send("This link is gone or was never created.");

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Robots-Tag", "noindex");
    return res.redirect(302, target);
  } catch (error) {
    console.error("GET /q/:slug", error);
    return res.status(503).send("Link storage is not configured.");
  }
}
