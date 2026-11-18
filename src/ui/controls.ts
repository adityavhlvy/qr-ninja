// Square corners, one accent, the same control heights as the portfolio.
// Keep every control here so the page cannot drift.
const base =
  "group inline-flex h-11 items-center justify-center gap-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50";

export const buttonClass = (variant: "primary" | "outline" | "ghost" = "primary") => {
  if (variant === "primary") return `${base} px-4 bg-sea text-on-sea hover:bg-ink hover:text-paper`;
  if (variant === "ghost") return `${base} px-2 text-mute hover:text-ink`;
  return `${base} px-4 border border-ink/80 text-ink hover:bg-ink hover:text-paper`;
};

export const inputClass =
  "block w-full border border-line bg-paper px-3 text-ink transition-colors placeholder:text-mute hover:border-mute focus:border-sea focus:outline-none";

export const fieldClass = `${inputClass} h-11`;

export const areaClass = `${inputClass} min-h-24 py-3`;

export const chipClass = (active: boolean) =>
  `inline-flex h-9 cursor-pointer items-center border px-3 text-sm transition-colors ${
    active ? "border-ink bg-ink text-paper" : "border-line text-ink hover:border-ink"
  }`;

export const panelClass = "border border-line";

export const rowClass = "flex flex-wrap items-center justify-between gap-3 py-3";
