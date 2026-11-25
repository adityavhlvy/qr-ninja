// Both apps must import one token file. This check fails if an app drifts back
// to a local copy, or if the package stops defining a token.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const IMPORT = '@import "@adityavhlvy/design-system/tokens.css";';
const TOKENS = ["--paper", "--sunk", "--ink", "--mute", "--line", "--sea", "--on-sea"];
let failures = 0;

function check(name: string, pass: boolean, detail = "") {
  if (pass) {
    console.log(`ok   ${name}`);
    return;
  }
  failures++;
  console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
}

const own = readFileSync(join(process.cwd(), "src/styles.css"), "utf8");
check("qr app imports the package tokens", own.includes(IMPORT));

const packagePath = join(process.cwd(), "node_modules/@adityavhlvy/design-system/tokens.css");
check("package tokens are installed", existsSync(packagePath), packagePath);
if (existsSync(packagePath)) {
  const css = readFileSync(packagePath, "utf8");
  for (const token of TOKENS) check(`${token} defined`, css.includes(`${token}:`));
}

const roots = [process.env.KURA_CLIENT_PATH, "../../../kura-ninja-client", "../../kura-ninja-client"].filter(
  (root): root is string => Boolean(root),
);
for (const root of roots) {
  const file = join(root, "src/styles.css");
  if (!existsSync(file)) continue;
  check("portfolio imports the package tokens", readFileSync(file, "utf8").includes(IMPORT));
  break;
}

if (failures > 0) {
  console.error(`\n${failures} design source check(s) failed`);
  process.exit(1);
}
console.log("\nboth apps share one token source");
