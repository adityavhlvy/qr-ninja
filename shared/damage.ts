import { encode } from "uqr";
import type { Ecc } from "./types.js";

/**
 * Damage analysis for a QR code.
 *
 * The honest model: error correction protects *codewords*, and codewords live
 * in the data region. The function patterns (finders, timing, alignment,
 * format) are not protected at all. Damage one of those and no amount of
 * correction saves the code. That distinction is the whole lesson, so it is
 * the first thing this module computes.
 */

/** uqr's module type enum, mirrored so the UI does not import the package. */
export const MODULE = {
  Border: -1,
  Data: 0,
  Function: 1,
  Position: 2,
  Timing: 3,
  Alignment: 4,
} as const;

export type ModuleType = (typeof MODULE)[keyof typeof MODULE];

/** Recovery capacity per level, as a fraction of codewords. */
export const ECC_BUDGET: Record<Ecc, number> = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 };

export interface Grid {
  /** Modules per side, quiet zone included. */
  size: number;
  /** Quiet zone in modules. */
  margin: number;
  version: number;
  ecc: Ecc;
  /** true = dark module. */
  data: boolean[][];
  types: ModuleType[][];
}

export function buildGrid(text: string, ecc: Ecc, margin: number): Grid {
  const result = encode(text, { ecc, border: margin });
  return {
    size: result.size,
    margin,
    version: result.version,
    ecc,
    data: result.data,
    types: result.types as ModuleType[][],
  };
}

/** A damage mask is one byte per module: 0 intact, 1 damaged. */
export type Mask = Uint8Array;

export function emptyMask(size: number): Mask {
  return new Uint8Array(size * size);
}

export interface TypeBreakdown {
  data: number;
  function: number;
  position: number;
  timing: number;
  alignment: number;
  border: number;
}

export interface DamageReport {
  /** Modules inside the code, quiet zone excluded. */
  total: number;
  /** Modules that carry data and are protected by error correction. */
  protectedTotal: number;
  damaged: number;
  damagedProtected: number;
  /** Damaged modules that no error correction can recover. */
  damagedUnprotected: number;
  breakdown: TypeBreakdown;
  /** Damaged protected modules as a fraction of all protected modules. */
  ratio: number;
  /** The level's recovery capacity, as a fraction. */
  budget: number;
  /** How much of the budget is used, 0 to 1 and beyond. */
  used: number;
  /** True when the damage is already past what the level can recover. */
  overBudget: boolean;
  /** True when a function pattern is hit, which is fatal regardless of level. */
  fatal: boolean;
  /** Human-readable reason, or null. */
  verdict: string | null;
}

const isProtected = (type: ModuleType) => type === MODULE.Data;

/**
 * Counts damage by module type. The quiet zone is excluded from every total,
 * because a scanner does not read it as data.
 */
export function analyse(grid: Grid, mask: Mask): DamageReport {
  const breakdown: TypeBreakdown = { data: 0, function: 0, position: 0, timing: 0, alignment: 0, border: 0 };
  let total = 0;
  let protectedTotal = 0;
  let damaged = 0;
  let damagedProtected = 0;
  let damagedUnprotected = 0;

  for (let y = 0; y < grid.size; y++) {
    for (let x = 0; x < grid.size; x++) {
      const type = grid.types[y][x];
      if (type === MODULE.Border) continue;

      total++;
      if (isProtected(type)) protectedTotal++;

      if (!mask[y * grid.size + x]) continue;
      damaged++;

      if (isProtected(type)) {
        damagedProtected++;
        breakdown.data++;
      } else {
        damagedUnprotected++;
        if (type === MODULE.Position) breakdown.position++;
        else if (type === MODULE.Timing) breakdown.timing++;
        else if (type === MODULE.Alignment) breakdown.alignment++;
        else breakdown.function++;
      }
    }
  }

  const ratio = protectedTotal === 0 ? 0 : damagedProtected / protectedTotal;
  const level = ECC_BUDGET[grid.ecc];
  const used = level === 0 ? 0 : ratio / level;
  const fatal = damagedUnprotected > 0;

  return {
    total,
    protectedTotal,
    damaged,
    damagedProtected,
    damagedUnprotected,
    breakdown,
    ratio,
    budget: level,
    used,
    overBudget: ratio > level,
    fatal,
    verdict: verdictFor(fatal, ratio, level),
  };
}

function verdictFor(fatal: boolean, ratio: number, budget: number): string | null {
  if (fatal) return "A function pattern is damaged. No error correction can recover this.";
  if (ratio === 0) return null;
  if (ratio > budget) return `Past the ${Math.round(budget * 100)}% budget. This code will not scan.`;
  if (ratio > budget * 0.75) return "Close to the limit. Test on two phones before you print it.";
  return null;
}

export interface DamageStyle {
  /** Brush radius in modules. */
  radius: number;
  /** "erase" repairs, everything else damages. */
  mode: "damage" | "erase";
}

/** Paints a filled circle into the mask. Used by the brush and the eraser. */
export function paint(mask: Mask, size: number, cx: number, cy: number, radius: number, mode: DamageStyle["mode"]): Mask {
  const next = new Uint8Array(mask);
  const r2 = radius * radius;

  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r2) continue;
      next[y * size + x] = mode === "erase" ? 0 : 1;
    }
  }

  return next;
}

/** A rectangular sticker, in module coordinates. */
export function sticker(mask: Mask, size: number, x0: number, y0: number, w: number, h: number): Mask {
  const next = new Uint8Array(mask);
  for (let y = Math.max(0, y0); y < Math.min(size, y0 + h); y++) {
    for (let x = Math.max(0, x0); x < Math.min(size, x0 + w); x++) {
      next[y * size + x] = 1;
    }
  }
  return next;
}

/**
 * A fold: a diagonal band across the code, the way a printed sheet creases.
 * The band is `thickness` modules wide and runs corner to corner.
 */
export function fold(mask: Mask, size: number, thickness: number, offset: number): Mask {
  const next = new Uint8Array(mask);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.abs(x - y - offset) / Math.SQRT2;
      if (distance <= thickness / 2) next[y * size + x] = 1;
    }
  }
  return next;
}

/** A coffee ring: an annulus, because that is what a cup leaves behind. */
export function ring(mask: Mask, size: number, cx: number, cy: number, inner: number, outer: number): Mask {
  const next = new Uint8Array(mask);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance >= inner && distance <= outer) next[y * size + x] = 1;
    }
  }
  return next;
}

/** Random damage, seeded so the same seed always produces the same code. */
export function sprinkle(mask: Mask, size: number, count: number, seed: number): Mask {
  const next = new Uint8Array(mask);
  let state = seed >>> 0 || 1;

  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };

  for (let i = 0; i < count; i++) {
    const x = Math.floor(random() * size);
    const y = Math.floor(random() * size);
    next[y * size + x] = 1;
  }

  return next;
}

/**
 * Renders the damaged code to a canvas at a fixed module size. The quiet zone
 * is drawn as light, and damaged modules are drawn in the damage colour, which
 * is what a scanner actually sees when the ink is gone.
 */
export function drawToCanvas(
  canvas: HTMLCanvasElement,
  grid: Grid,
  mask: Mask,
  options: { modulePx: number; fore: string; back: string; damage: string; showDamage: boolean },
): void {
  const { modulePx, fore, back, damage, showDamage } = options;
  const px = grid.size * modulePx;
  canvas.width = px;
  canvas.height = px;

  const context = canvas.getContext("2d");
  if (!context) return;

  context.fillStyle = back;
  context.fillRect(0, 0, px, px);

  for (let y = 0; y < grid.size; y++) {
    for (let x = 0; x < grid.size; x++) {
      const index = y * grid.size + x;
      const dark = grid.data[y][x];
      const hit = mask[index] === 1;

      if (hit && showDamage) {
        context.fillStyle = damage;
        context.fillRect(x * modulePx, y * modulePx, modulePx, modulePx);
        continue;
      }
      if (!dark) continue;
      context.fillStyle = fore;
      context.fillRect(x * modulePx, y * modulePx, modulePx, modulePx);
    }
  }
}

/** Reads the canvas back as RGBA, which is what jsQR wants. */
export function readPixels(canvas: HTMLCanvasElement): Uint8ClampedArray {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  return context.getImageData(0, 0, canvas.width, canvas.height).data;
}
