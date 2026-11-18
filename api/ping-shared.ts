import { validateTarget } from "../shared/validate.js";

export default function handler(_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  res.status(200).json({ ok: validateTarget("https://example.com").ok, where: "shared" });
}
