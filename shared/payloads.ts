import { validateTarget } from "./validate.js";

export type PresetId = "url" | "text" | "wifi" | "vcard" | "email" | "phone" | "sms" | "geo" | "event";

export interface Field {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "textarea" | "datetime-local" | "email" | "tel" | "url";
  options?: string[];
  defaultValue?: string;
  hint?: string;
}

export interface Preset {
  id: PresetId;
  label: string;
  summary: string;
  fields: Field[];
  /** Returns "" while a required field is still empty. */
  build: (values: Record<string, string>) => string;
  /** A message to show under the fields, or null. */
  error?: (values: Record<string, string>) => string | null;
}

const text = (values: Record<string, string>, key: string) => (values[key] ?? "").trim();
const has = (values: Record<string, string>, ...keys: string[]) => keys.every((key) => text(values, key) !== "");

const wifiEscape = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");
const vcardEscape = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
const icalEscape = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

/** "2026-11-18T09:00" from a datetime-local input to "20261118T090000". */
function stamp(value: string): string {
  const digits = value.trim().replace(/[-:]/g, "");
  return /^\d{8}T\d{4}$/.test(digits) ? `${digits}00` : "";
}

function numeric(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const PRESETS: Preset[] = [
  {
    id: "url",
    label: "Link",
    summary: "Open a website. Short links work here too.",
    fields: [
      {
        name: "url",
        label: "Address",
        placeholder: "https://example.com/page",
        required: true,
        type: "url",
        hint: "Include https:// so every scanner opens it as a page.",
      },
    ],
    build: (values) => {
      const check = validateTarget(text(values, "url"));
      return check.ok ? check.url : "";
    },
    error: (values) => {
      const raw = text(values, "url");
      if (!raw) return null;
      const check = validateTarget(raw);
      return check.ok ? null : check.error;
    },
  },
  {
    id: "text",
    label: "Text",
    summary: "Plain text. Every scanner shows it before anything else.",
    fields: [{ name: "body", label: "Text", type: "textarea", placeholder: "Anything you want to carry", required: true }],
    build: (values) => text(values, "body"),
  },
  {
    id: "wifi",
    label: "Wi-Fi",
    summary: "Join a network without typing the password.",
    fields: [
      { name: "ssid", label: "Network name", placeholder: "KuraNet", required: true },
      {
        name: "security",
        label: "Security",
        options: ["WPA", "WEP", "nopass"],
        defaultValue: "WPA",
      },
      { name: "password", label: "Password", type: "text", placeholder: "Leave empty for open networks" },
      {
        name: "hidden",
        label: "Hidden network",
        options: ["no", "yes"],
        defaultValue: "no",
      },
    ],
    build: (values) => {
      if (!has(values, "ssid")) return "";
      const security = text(values, "security") || "WPA";
      const password = text(values, "password");
      const hidden = text(values, "hidden") === "yes" ? "H:true;" : "";
      const pass = security === "nopass" ? "" : `P:${wifiEscape(password)};`;
      return `WIFI:T:${security};S:${wifiEscape(text(values, "ssid"))};${pass}${hidden};`;
    },
  },
  {
    id: "vcard",
    label: "Contact",
    summary: "A contact card that saves straight into the address book.",
    fields: [
      { name: "name", label: "Full name", placeholder: "Aditya Vahlevy", required: true },
      { name: "org", label: "Company", placeholder: "Kura Ninja" },
      { name: "title", label: "Job title", placeholder: "Software Engineer" },
      { name: "phone", label: "Phone", type: "tel", placeholder: "+62 812 0000 0000" },
      { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
      { name: "url", label: "Website", type: "url", placeholder: "https://example.com" },
    ],
    build: (values) => {
      if (!has(values, "name")) return "";
      const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:;${vcardEscape(text(values, "name"))};;;`, `FN:${vcardEscape(text(values, "name"))}`];
      if (has(values, "org")) lines.push(`ORG:${vcardEscape(text(values, "org"))}`);
      if (has(values, "title")) lines.push(`TITLE:${vcardEscape(text(values, "title"))}`);
      if (has(values, "phone")) lines.push(`TEL;TYPE=CELL:${text(values, "phone")}`);
      if (has(values, "email")) lines.push(`EMAIL:${text(values, "email")}`);
      if (has(values, "url")) lines.push(`URL:${text(values, "url")}`);
      lines.push("END:VCARD");
      return lines.join("\r\n");
    },
  },
  {
    id: "email",
    label: "Email",
    summary: "Start a message with the address, subject, and body ready.",
    fields: [
      { name: "to", label: "To", type: "email", placeholder: "you@example.com", required: true },
      { name: "subject", label: "Subject", placeholder: "Hello" },
      { name: "body", label: "Message", type: "textarea", placeholder: "Saw your QR tool" },
    ],
    build: (values) => {
      if (!has(values, "to")) return "";
      const query = new URLSearchParams();
      if (has(values, "subject")) query.set("subject", text(values, "subject"));
      if (has(values, "body")) query.set("body", text(values, "body"));
      const suffix = query.toString();
      return `mailto:${text(values, "to")}${suffix ? `?${suffix}` : ""}`;
    },
  },
  {
    id: "phone",
    label: "Phone",
    summary: "Open the dialler with the number filled in.",
    fields: [{ name: "number", label: "Number", type: "tel", placeholder: "+62 812 0000 0000", required: true }],
    build: (values) => {
      const number = text(values, "number").replace(/[^\d+]/g, "");
      return number ? `tel:${number}` : "";
    },
  },
  {
    id: "sms",
    label: "SMS",
    summary: "Open a text message to a number.",
    fields: [
      { name: "number", label: "Number", type: "tel", placeholder: "+62 812 0000 0000", required: true },
      { name: "message", label: "Message", type: "textarea", placeholder: "Hi" },
    ],
    build: (values) => {
      if (!has(values, "number")) return "";
      const number = text(values, "number").replace(/[^\d+]/g, "");
      const message = text(values, "message");
      return message ? `SMSTO:${number}:${message}` : `SMSTO:${number}`;
    },
  },
  {
    id: "geo",
    label: "Place",
    summary: "Drop a pin at a latitude and longitude.",
    fields: [
      { name: "lat", label: "Latitude", placeholder: "-6.2088", required: true },
      { name: "lng", label: "Longitude", placeholder: "106.8456", required: true },
    ],
    build: (values) => {
      const lat = numeric(text(values, "lat"));
      const lng = numeric(text(values, "lng"));
      return lat === null || lng === null ? "" : `geo:${lat},${lng}`;
    },
    error: (values) => {
      const lat = numeric(text(values, "lat"));
      const lng = numeric(text(values, "lng"));
      if (lat !== null && (lat < -90 || lat > 90)) return "Latitude must be between -90 and 90.";
      if (lng !== null && (lng < -180 || lng > 180)) return "Longitude must be between -180 and 180.";
      return null;
    },
  },
  {
    id: "event",
    label: "Event",
    summary: "Add a calendar entry with a time and place.",
    fields: [
      { name: "title", label: "Title", placeholder: "Design review", required: true },
      { name: "start", label: "Starts", type: "datetime-local", required: true },
      { name: "end", label: "Ends", type: "datetime-local", required: true },
      { name: "location", label: "Location", placeholder: "Jakarta" },
      { name: "notes", label: "Notes", type: "textarea", placeholder: "Bring the printed QR" },
    ],
    build: (values) => {
      const start = stamp(text(values, "start"));
      const end = stamp(text(values, "end"));
      if (!has(values, "title") || !start || !end) return "";
      const lines = ["BEGIN:VEVENT", `SUMMARY:${icalEscape(text(values, "title"))}`, `DTSTART:${start}`, `DTEND:${end}`];
      if (has(values, "location")) lines.push(`LOCATION:${icalEscape(text(values, "location"))}`);
      if (has(values, "notes")) lines.push(`DESCRIPTION:${icalEscape(text(values, "notes"))}`);
      lines.push("END:VEVENT");
      return lines.join("\r\n");
    },
    error: (values) => {
      const start = stamp(text(values, "start"));
      const end = stamp(text(values, "end"));
      return start && end && end < start ? "The end time is before the start time." : null;
    },
  },
];

export const PRESET_BY_ID = new Map(PRESETS.map((preset) => [preset.id, preset]));

/** Fields for a preset, with the defaults already applied. */
export function initialValues(preset: Preset): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of preset.fields) values[field.name] = field.defaultValue ?? "";
  return values;
}

export function buildPayload(preset: Preset, values: Record<string, string>): string {
  return preset.build(values);
}
