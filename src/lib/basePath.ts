/** Empty in local dev, "/tools/qr" when served through the portfolio proxy. */
export const BASE_PATH = (import.meta.env.PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
