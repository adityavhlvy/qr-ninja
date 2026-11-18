export const ECC_LEVELS = ["L", "M", "Q", "H"] as const;
export type Ecc = (typeof ECC_LEVELS)[number];

export const DOT_STYLES = ["square", "rounded", "dots"] as const;
export type DotStyle = (typeof DOT_STYLES)[number];

export interface QrStyle {
  ecc: Ecc;
  dotStyle: DotStyle;
  /** Quiet zone in modules. 4 is the ISO minimum and the default. */
  margin: number;
  /** Intrinsic pixel size of the exported file. */
  size: number;
  fore: string;
  back: string;
  /** Optional second colour for a diagonal gradient. */
  accent: string | null;
  /** Data URL of a logo, or null. */
  logo: string | null;
}

export const DEFAULT_STYLE: QrStyle = {
  ecc: "M",
  dotStyle: "square",
  margin: 4,
  size: 512,
  fore: "#101317",
  back: "#ffffff",
  accent: null,
  logo: null,
};

export const MAX_PAYLOAD = 1200;
export const MIN_MARGIN = 0;
export const MAX_MARGIN = 8;
export const MIN_SIZE = 128;
export const MAX_SIZE = 1024;
export const CONTRAST_WARN = 4.5;
