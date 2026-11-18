import { isSlug } from "../server/links";

export default function handler(_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  res.status(200).json({ ok: isSlug("abcdefg"), where: "server" });
}
