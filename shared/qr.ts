import { encode } from "uqr";
import type { QrStyle } from "./types";

export interface QrRender {
  svg: string;
  /** Modules per side, quiet zone excluded. */
  modules: number;
  version: number;
}

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const LOGO_PATTERN = /^data:image\/(?:png|jpe?g|webp|gif|svg\+xml);base64,[a-z0-9+/=\s]+$/i;

function finderAt(rows: boolean[][], x: number, y: number): boolean {
  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      const expected = dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
      if (rows[y + dy][x + dx] !== expected) return false;
    }
  }
  return true;
}

function alignmentAt(rows: boolean[][], x: number, y: number): boolean {
  for (let dy = 0; dy < 5; dy++) {
    for (let dx = 0; dx < 5; dx++) {
      const expected = dx === 0 || dx === 4 || dy === 0 || dy === 4 || (dx === 2 && dy === 2);
      if (rows[y + dy][x + dx] !== expected) return false;
    }
  }
  return true;
}

/**
 * Encodes text and draws the matrix ourselves so the caller can pick module
 * shapes, a gradient, and a centre logo. `uqr` only supplies the bit matrix.
 *
 * Rounded and dotted modules break the 1:1:3:1:1 run that scanners look for in
 * the finder patterns, and the 1:1:1:1:1 run in the alignment patterns. Both
 * are therefore redrawn as one continuous piece. Everything else stays on the
 * grid, which is what keeps the code readable by a decoder.
 */
export function renderQr(text: string, style: QrStyle): QrRender {
  const result = encode(text, { ecc: style.ecc, border: style.margin });
  const size = result.size;
  const rows = result.data;
  const hardEdges = style.dotStyle === "square";
  const gradient = style.accent !== null && style.accent.toLowerCase() !== style.fore.toLowerCase();
  const gradientId = `qg${Math.random().toString(36).slice(2, 9)}`;
  const paint = gradient ? `url(#${gradientId})` : escapeXml(style.fore);
  const background = escapeXml(style.back);

  const masked = rows.map((row) => row.map(() => false));
  const finders: Array<[number, number]> = [];
  const alignments: Array<[number, number]> = [];

  if (!hardEdges) {
    const origins: Array<[number, number]> = [
      [style.margin, style.margin],
      [size - style.margin - 7, style.margin],
      [style.margin, size - style.margin - 7],
    ];

    for (const [x, y] of origins) {
      if (!finderAt(rows, x, y)) continue;
      finders.push([x, y]);
      for (let dy = 0; dy < 7; dy++) {
        for (let dx = 0; dx < 7; dx++) masked[y + dy][x + dx] = true;
      }
    }

    for (let y = 0; y + 5 <= size; y++) {
      for (let x = 0; x + 5 <= size; x++) {
        const insideFinder = finders.some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
        if (insideFinder || !alignmentAt(rows, x, y)) continue;
        alignments.push([x, y]);
        for (let dy = 0; dy < 5; dy++) {
          for (let dx = 0; dx < 5; dx++) masked[y + dy][x + dx] = true;
        }
      }
    }
  }

  const cells: string[] = [];
  const path: string[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!rows[y][x] || masked[y][x]) continue;
      if (style.dotStyle === "dots") {
        cells.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.46"/>`);
      } else if (style.dotStyle === "rounded") {
        cells.push(`<rect x="${x + 0.06}" y="${y + 0.06}" width="0.88" height="0.88" rx="0.3"/>`);
      } else {
        path.push(`M${x} ${y}h1v1h-1z`);
      }
    }
  }

  const body =
    style.dotStyle === "square"
      ? `<path d="${path.join("")}" fill="${paint}"/>`
      : `<g fill="${paint}">${cells.join("")}</g>`;

  const eyes: string[] = [];
  for (const [x, y] of finders) {
    if (style.dotStyle === "dots") {
      const cx = x + 3.5;
      const cy = y + 3.5;
      eyes.push(
        `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${paint}"/>`,
        `<circle cx="${cx}" cy="${cy}" r="2.5" fill="${background}"/>`,
        `<circle cx="${cx}" cy="${cy}" r="1.5" fill="${paint}"/>`,
      );
    } else {
      eyes.push(
        `<rect x="${x}" y="${y}" width="7" height="7" rx="2" fill="${paint}"/>`,
        `<rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="1.4" fill="${background}"/>`,
        `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.9" fill="${paint}"/>`,
      );
    }
  }

  for (const [x, y] of alignments) {
    if (style.dotStyle === "dots") {
      const cx = x + 2.5;
      const cy = y + 2.5;
      eyes.push(
        `<circle cx="${cx}" cy="${cy}" r="2.5" fill="${paint}"/>`,
        `<circle cx="${cx}" cy="${cy}" r="1.5" fill="${background}"/>`,
        `<circle cx="${cx}" cy="${cy}" r="0.5" fill="${paint}"/>`,
      );
    } else {
      eyes.push(
        `<rect x="${x}" y="${y}" width="5" height="5" rx="1" fill="${paint}"/>`,
        `<rect x="${x + 1}" y="${y + 1}" width="3" height="3" rx="0.6" fill="${background}"/>`,
        `<rect x="${x + 2}" y="${y + 2}" width="1" height="1" rx="0.3" fill="${paint}"/>`,
      );
    }
  }

  let logo = "";
  if (style.logo && LOGO_PATTERN.test(style.logo)) {
    const usable = size - style.margin * 2;
    const box = usable * 0.22;
    const pad = 0.6;
    const x = (size - box) / 2;
    logo =
      `<rect x="${x - pad}" y="${x - pad}" width="${box + pad * 2}" height="${box + pad * 2}" rx="0.6" fill="${background}"/>` +
      `<image href="${style.logo}" x="${x}" y="${x}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const defs = gradient
    ? `<defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${escapeXml(style.fore)}"/><stop offset="1" stop-color="${escapeXml(style.accent!)}"/></linearGradient></defs>`
    : "";

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${style.size}" height="${style.size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR code"${hardEdges ? ' shape-rendering="crispEdges"' : ""}>` +
    `<rect width="${size}" height="${size}" fill="${background}"/>` +
    defs +
    body +
    eyes.join("") +
    logo +
    `</svg>`;

  return { svg, modules: size - style.margin * 2, version: result.version };
}
