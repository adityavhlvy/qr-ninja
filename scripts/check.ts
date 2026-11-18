// Runnable check for the parts that are easy to break: payload escaping, the
// short-link target guard, and whether the custom renderer still produces a
// code a decoder can read. Run with `bun run check`.
import { Resvg } from "@resvg/resvg-js";
import jsQR from "jsqr";
import { PRESET_BY_ID, PRESETS } from "../shared/payloads";
import { DEFAULT_STYLE } from "../shared/types";
import type { QrStyle } from "../shared/types";
import { renderQr } from "../shared/qr";
import { contrastRatio, validateTarget } from "../shared/validate";

let failures = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`ok   ${name}`);
    return;
  }
  failures++;
  console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
}

function build(id: string, values: Record<string, string>): string {
  const preset = PRESET_BY_ID.get(id as never);
  if (!preset) throw new Error(`Unknown preset ${id}`);
  return preset.build(values);
}

function decode(svg: string, px = 1024): string | null {
  const image = new Resvg(svg, { fitTo: { mode: "width", value: px } }).render();
  return jsQR(new Uint8ClampedArray(image.pixels), image.width, image.height)?.data ?? null;
}

const url = "https://example.com/a/reasonably/long/path?with=query&and=more";

// Payload builders
check("url passes", build("url", { url }) === url);
check("url rejects javascript", build("url", { url: "javascript:alert(1)" }) === "");
check("text passes", build("text", { body: "hello" }) === "hello");
check(
  "wifi escapes separators",
  build("wifi", { ssid: "Kura;Net", security: "WPA", password: "pa;ss", hidden: "yes" }) ===
    "WIFI:T:WPA;S:Kura\\;Net;P:pa\\;ss;H:true;;",
);
check("wifi open network omits password", build("wifi", { ssid: "Cafe", security: "nopass" }) === "WIFI:T:nopass;S:Cafe;;");

const vcard = build("vcard", { name: "Ada Lovelace", org: "Analytical", email: "ada@example.com" });
check("vcard has header", vcard.startsWith("BEGIN:VCARD") && vcard.endsWith("END:VCARD"));
check("vcard escapes name", vcard.includes("N:;Ada Lovelace;;;"));

check("phone strips noise", build("phone", { number: "+62 (812) 0000" }) === "tel:+628120000");
check("geo uses numbers", build("geo", { lat: "-6.2", lng: "106.8" }) === "geo:-6.2,106.8");
check(
  "event stamps local time",
  build("event", { title: "Review", start: "2026-11-18T09:00", end: "2026-11-18T10:00" }).includes("DTSTART:20261118T090000"),
);

// Short-link guard
check("accepts public https", validateTarget("https://kura-ninja.dev/x").ok);
check("rejects localhost", !validateTarget("http://localhost:3000/x").ok);
check("rejects private 10/8", !validateTarget("http://10.1.2.3/x").ok);
check("rejects private 172.16/12", !validateTarget("http://172.20.1.1/x").ok);
check("allows 172.32", validateTarget("http://172.32.0.1/x").ok);
check("rejects credentials", !validateTarget("https://user:pass@example.com/x").ok);
check("rejects data url", !validateTarget("data:text/html,hi").ok);

// Contrast guard used by the style panel
check("black on white is high contrast", contrastRatio("#000000", "#ffffff") > 20);
check("grey on grey is low contrast", contrastRatio("#777777", "#888888") < 4.5);

// The renderer has to survive every module style, and still decode.
const base: QrStyle = { ...DEFAULT_STYLE, size: 1024 };
for (const dotStyle of ["square", "rounded", "dots"] as const) {
  for (const px of [512, 1024]) {
    const code = decode(renderQr(url, { ...base, dotStyle }).svg, px);
    check(`${dotStyle} decodes at ${px}px`, code === url, code ?? "no result");
  }
}

// A long payload needs a higher version, which adds several alignment patterns.
const long = `https://example.com/${"segment/".repeat(60)}`;
for (const dotStyle of ["square", "rounded", "dots"] as const) {
  const code = decode(renderQr(long, { ...base, dotStyle }).svg, 1024);
  check(`${dotStyle} decodes a high version`, code === long, code ?? "no result");
}

const gradient = decode(renderQr(url, { ...base, dotStyle: "rounded", fore: "#121518", accent: "#1f3fd1" }).svg);
check("gradient decodes", gradient === url, gradient ?? "no result");

const logo = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#1f3fd1"/><circle cx="5" cy="5" r="3" fill="#ffffff"/></svg>',
).toString("base64")}`;
const withLogo = decode(renderQr(url, { ...base, ecc: "H", dotStyle: "square", logo }).svg);
check("logo with ECC H decodes", withLogo === url, withLogo ?? "no result");

// Every preset with plausible input should produce something renderable.
for (const preset of PRESETS) {
  const values: Record<string, string> = {};
  for (const field of preset.fields) values[field.name] = field.defaultValue ?? "X";
  const payload = preset.build(values);
  if (!payload) continue;
  let rendered = false;
  try {
    rendered = renderQr(payload, base).svg.startsWith("<svg");
  } catch {
    rendered = false;
  }
  check(`preset ${preset.id} renders`, rendered);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
