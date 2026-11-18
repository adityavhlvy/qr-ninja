import type { VercelRequest, VercelResponse } from "@vercel/node";
import { renderQr } from "../shared/qr";
import { DEFAULT_STYLE, DOT_STYLES, ECC_LEVELS, MAX_MARGIN, MAX_PAYLOAD, MAX_SIZE, MIN_MARGIN, MIN_SIZE } from "../shared/types";
import type { DotStyle, Ecc } from "../shared/types";
import { isHexColor } from "../shared/validate";

function integer(value: string | null, fallback: number, min: number, max: number): number {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const params = new URL(req.url ?? "/", "http://local").searchParams;
  const text = params.get("text") ?? "";
  if (!text.trim()) return res.status(400).json({ error: "Add a text parameter." });
  if (text.length > MAX_PAYLOAD) return res.status(400).json({ error: `text is limited to ${MAX_PAYLOAD} characters.` });

  const eccParam = (params.get("ecc") ?? "M").toUpperCase();
  if (!ECC_LEVELS.includes(eccParam as Ecc)) return res.status(400).json({ error: "ecc must be L, M, Q, or H." });

  const styleParam = params.get("style") ?? "square";
  if (!DOT_STYLES.includes(styleParam as DotStyle)) {
    return res.status(400).json({ error: "style must be square, rounded, or dots." });
  }

  const dark = params.get("dark") ?? DEFAULT_STYLE.fore;
  const light = params.get("light") ?? DEFAULT_STYLE.back;
  if (!isHexColor(dark) || !isHexColor(light)) {
    return res.status(400).json({ error: "dark and light must be hex colours, for example %23101317." });
  }

  try {
    const { svg } = renderQr(text, {
      ...DEFAULT_STYLE,
      ecc: eccParam as Ecc,
      dotStyle: styleParam as DotStyle,
      margin: integer(params.get("margin"), DEFAULT_STYLE.margin, MIN_MARGIN, MAX_MARGIN),
      size: integer(params.get("size"), DEFAULT_STYLE.size, MIN_SIZE, MAX_SIZE),
      fore: dark,
      back: light,
    });

    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(svg);
  } catch (error) {
    console.error("GET /api/qr", error);
    return res.status(400).json({ error: "That text does not fit in a QR code." });
  }
}
