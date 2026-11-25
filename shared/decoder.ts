import jsQR from "jsqr";

export interface Decoded {
  text: string;
  /** Where the decoder found the code, in pixels. */
  corners: Array<{ x: number; y: number }>;
}

/**
 * Decodes RGBA pixels. `inversionAttempts: "dontInvert"` keeps the cost down
 * and matches how a phone camera reads a normal, dark-on-light code.
 */
export function decodePixels(pixels: Uint8ClampedArray, width: number, height: number): Decoded | null {
  const result = jsQR(pixels, width, height, { inversionAttempts: "dontInvert" });
  if (!result) return null;
  return {
    text: result.data,
    corners: [
      { x: result.location.topLeftCorner.x, y: result.location.topLeftCorner.y },
      { x: result.location.topRightCorner.x, y: result.location.topRightCorner.y },
      { x: result.location.bottomRightCorner.x, y: result.location.bottomRightCorner.y },
      { x: result.location.bottomLeftCorner.x, y: result.location.bottomLeftCorner.y },
    ],
  };
}

/** Decodes a canvas that is already drawn. */
export function decodeCanvas(canvas: HTMLCanvasElement): Decoded | null {
  const context = canvas.getContext("2d");
  if (!context) return null;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return decodePixels(image.data, canvas.width, canvas.height);
}
