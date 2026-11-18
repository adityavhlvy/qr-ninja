// The portfolio is the source of truth for the design tokens. This app copies
// them, and this check fails when the copies drift. Run with `bun run check`.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REMOTE = "https://raw.githubusercontent.com/adityavhlvy/kura-ninja-client/dev/src/styles.css";
const TOKENS = ["--paper", "--sunk", "--ink", "--mute", "--line", "--sea", "--on-sea"] as const;
const FONTS = ["--font-sans", "--font-mono"] as const;
const LABEL_PROPS = ["font-family", "font-size", "line-height", "color"] as const;

let failures = 0;

function check(name: string, pass: boolean, detail = "") {
  if (pass) {
    console.log(`ok   ${name}`);
    return;
  }
  failures++;
  console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
}

/**
 * Body of the first rule whose selector is exactly `selector`. The selector
 * must be followed by nothing but whitespace before the brace, so mentions
 * inside @custom-variant or descendant rules are skipped.
 */
function block(css: string, selector: string): string {
  let from = 0;
  while (from <= css.length) {
    const start = css.indexOf(selector, from);
    if (start === -1) return "";
    const after = start + selector.length;
    const open = css.indexOf("{", after);
    if (open !== -1 && css.slice(after, open).trim() === "") {
      let depth = 0;
      for (let index = open; index < css.length; index++) {
        if (css[index] === "{") depth++;
        else if (css[index] === "}") {
          depth--;
          if (depth === 0) return css.slice(open + 1, index);
        }
      }
      return "";
    }
    from = after;
  }
  return "";
}

function declarations(body: string): Map<string, string> {
  const result = new Map<string, string>();
  const clean = body.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of clean.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    result.set(match[1], match[2].replace(/\s+/g, " ").trim());
  }
  return result;
}

function properties(body: string): Map<string, string> {
  const result = new Map<string, string>();
  const clean = body.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of clean.matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)) {
    result.set(match[1], match[2].replace(/\s+/g, " ").trim());
  }
  return result;
}

async function portfolioCss(): Promise<{ css: string; source: string }> {
  const roots = [process.env.KURA_CLIENT_PATH, "..", "../kura-ninja-client", "../../kura-ninja-client"].filter(
    (root): root is string => Boolean(root),
  );

  for (const root of roots) {
    const file = join(root, "src/styles.css");
    if (existsSync(file)) return { css: readFileSync(file, "utf8"), source: file };
  }

  const response = await fetch(REMOTE);
  if (!response.ok) throw new Error(`Cannot read the portfolio styles.css (${response.status}). Set KURA_CLIENT_PATH.`);
  return { css: await response.text(), source: REMOTE };
}

const local = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
const remote = await portfolioCss();
console.log(`source: ${remote.source}\n`);

for (const theme of ["light", "dark"] as const) {
  const selector = `[data-theme="${theme}"]`;
  const mine = declarations(block(local, selector));
  const theirs = declarations(block(remote.css, selector));

  for (const token of TOKENS) {
    const expected = theirs.get(token);
    const actual = mine.get(token);
    check(
      `${token} (${theme})`,
      Boolean(expected) && expected === actual,
      `portfolio ${expected ?? "missing"}, app ${actual ?? "missing"}`,
    );
  }
}

const myFonts = declarations(block(local, "@theme inline"));
const theirFonts = declarations(block(remote.css, "@theme inline"));
for (const font of FONTS) {
  check(`${font}`, theirFonts.get(font) === myFonts.get(font), `portfolio ${theirFonts.get(font)}, app ${myFonts.get(font)}`);
}

const myDisplay = properties(block(local, ".display"));
const theirDisplay = properties(block(remote.css, ".display"));
for (const [property, expected] of theirDisplay) {
  check(`.display ${property}`, myDisplay.get(property) === expected, `portfolio ${expected}, app ${myDisplay.get(property)}`);
}

const myLabel = properties(block(local, ".label"));
const theirLabel = properties(block(remote.css, ".label"));
for (const property of LABEL_PROPS) {
  const expected = theirLabel.get(property);
  check(`.label ${property}`, myLabel.get(property) === expected, `portfolio ${expected}, app ${myLabel.get(property)}`);
}

if (failures > 0) {
  console.error(`\n${failures} design value(s) drifted. Copy the portfolio value into src/styles.css.`);
  process.exit(1);
}
console.log("\ndesign system matches the portfolio");
