import { Resvg } from "@resvg/resvg-js";
import jsQR from "jsqr";
import { analyse, buildGrid, emptyMask, fold, paint, ring, sprinkle, sticker } from "../shared/damage.js";
import type { Grid, Mask } from "../shared/damage.js";
import { ECC_LEVELS } from "../shared/types.js";
import type { Ecc } from "../shared/types.js";

let failures = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`ok   ${name}`);
    return;
  }
  failures++;
  console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
}

const TEXT = "https://example.com/damage-lab";

/** Renders the grid plus mask to an SVG, then rasterises and decodes it. */
function decode(grid: Grid, mask: Mask, modulePx = 8): string | null {
  const px = grid.size * modulePx;
  const cells: string[] = [];

  for (let y = 0; y < grid.size; y++) {
    for (let x = 0; x < grid.size; x++) {
      if (!grid.data[y][x]) continue;
      if (mask[y * grid.size + x]) continue;
      cells.push(`M${x} ${y}h1v1h-1z`);
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${grid.size} ${grid.size}" shape-rendering="crispEdges">` +
    `<rect width="${grid.size}" height="${grid.size}" fill="#ffffff"/>` +
    `<path d="${cells.join("")}" fill="#000000"/>` +
    `</svg>`;

  const image = new Resvg(svg, { fitTo: { mode: "width", value: px } }).render();
  return jsQR(new Uint8ClampedArray(image.pixels), image.width, image.height)?.data ?? null;
}

// A clean code decodes.
const grid = buildGrid(TEXT, "M", 4);
check("clean code decodes", decode(grid, emptyMask(grid.size)) === TEXT);

// The report is empty on a clean code.
const clean = analyse(grid, emptyMask(grid.size));
check("clean report has no damage", clean.damaged === 0);
check("clean report has no verdict", clean.verdict === null);
check("clean report counts protected modules", clean.protectedTotal > 0);
check("clean report excludes the quiet zone", clean.total === grid.size * grid.size - (grid.size * grid.size - (grid.size - 8) ** 2));

// Damaging a finder pattern is fatal, and the report says so.
const finder = paint(emptyMask(grid.size), grid.size, 4, 4, 3, "damage");
const finderReport = analyse(grid, finder);
check("finder damage is fatal", finderReport.fatal);
check("finder damage is unprotected", finderReport.damagedUnprotected > 0);
check("finder damage has a verdict", finderReport.verdict !== null);

// One damaged finder is not always enough to stop a decoder: jsQR can still
// lock on with the other two. All three is the honest test.
let allFinders = emptyMask(grid.size);
for (const [x, y] of [
  [4, 4],
  [grid.size - 11, 4],
  [4, grid.size - 11],
] as const) {
  allFinders = paint(allFinders, grid.size, x + 3, y + 3, 3.5, "damage");
}
check("all three finders damaged does not decode", decode(grid, allFinders) !== TEXT);

// Damaging a few data modules is recoverable at M.
const small = paint(emptyMask(grid.size), grid.size, grid.size / 2, grid.size / 2, 1.5, "damage");
const smallReport = analyse(grid, small);
check("small damage is protected", smallReport.damagedUnprotected === 0);
check("small damage is under budget", !smallReport.overBudget);
check("small damage still decodes", decode(grid, small) === TEXT);

// Erasing repairs.
const erased = paint(small, grid.size, grid.size / 2, grid.size / 2, 3, "erase");
check("erase clears the mask", analyse(grid, erased).damaged === 0);

// A sticker over the centre is the classic logo case.
const centre = sticker(emptyMask(grid.size), grid.size, Math.floor(grid.size / 2) - 3, Math.floor(grid.size / 2) - 3, 6, 6);
const centreReport = analyse(grid, centre);
check("centre sticker is protected", centreReport.damagedUnprotected === 0);
check("centre sticker is under budget at M", !centreReport.overBudget);

// A fold across the whole code is not recoverable. It crosses the timing and
// alignment patterns, so it is fatal before the budget even matters.
const folded = fold(emptyMask(grid.size), grid.size, 3, 0);
const foldedReport = analyse(grid, folded);
check("fold damages many modules", foldedReport.damaged > 0);
check("fold hits function patterns", foldedReport.damagedUnprotected > 0);
check("fold is fatal", foldedReport.fatal);
check("fold does not decode", decode(grid, folded) !== TEXT);

// A coffee ring is an annulus, so the centre stays intact.
const coffee = ring(emptyMask(grid.size), grid.size, grid.size / 2, grid.size / 2, 4, 6);
const coffeeReport = analyse(grid, coffee);
check("ring damages modules", coffeeReport.damaged > 0);
check("ring leaves the centre alone", coffee[Math.floor(grid.size / 2) * grid.size + Math.floor(grid.size / 2)] === 0);

// Seeded damage is deterministic.
const a = sprinkle(emptyMask(grid.size), grid.size, 40, 12345);
const b = sprinkle(emptyMask(grid.size), grid.size, 40, 12345);
check("sprinkle is deterministic", a.every((value, index) => value === b[index]));
check("sprinkle damages the requested count", a.reduce((sum, value) => sum + value, 0) === 40);

// Higher levels survive more damage. This is the claim the whole tool makes.
const damage = sprinkle(emptyMask(grid.size), grid.size, 60, 999);
const survivors = ECC_LEVELS.filter((level) => {
  const levelGrid = buildGrid(TEXT, level as Ecc, 4);
  return decode(levelGrid, damage) === TEXT;
});
check("at least one level survives 60 damaged modules", survivors.length > 0, survivors.join(","));

// The budget table matches the spec.
check("L is 7%", Math.abs(analyse(buildGrid(TEXT, "L", 4), emptyMask(grid.size)).budget - 0.07) < 1e-9);
check("H is 30%", Math.abs(analyse(buildGrid(TEXT, "H", 4), emptyMask(grid.size)).budget - 0.3) < 1e-9);

// Painting outside the grid is clamped, not a crash.
const outside = paint(emptyMask(grid.size), grid.size, -5, -5, 2, "damage");
check("paint clamps out of bounds", outside.every((value) => value === 0));

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall damage checks passed");
