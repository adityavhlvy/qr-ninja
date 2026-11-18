# QR Ninja

A QR code tool by [Aditya Vahlevy Nugraha](https://adityavhlvy.vercel.app).
Nine payload types, custom modules and colours, a centre logo, PNG and SVG
download, a public SVG endpoint, and short links with scan counts.

It is a separate app on purpose. The portfolio keeps its own build and domain,
and this service can be deployed, scaled, and pointed at a different domain
without touching it.

## What runs where

| Layer | Folder | Responsibility |
| --- | --- | --- |
| Pure domain | `shared/` | Payload builders, input validation, QR matrix and SVG renderer. No IO, no DOM. |
| Storage | `server/` | Neon client, link queries, IP hashing. IO only. |
| HTTP | `api/` | Parse, validate, call `server/`, respond. No business rules. |
| UI | `src/` | React state and views. Imports `shared/` only. |

QR codes are generated in the browser. The only feature that touches the
network is the short link, because it needs a stored redirect and a counter.

## Run locally

```bash
bun install
cp .env.example .env      # fill both values
bun run dev               # UI on http://localhost:3000
```

The API and the redirect live in `/api`, which Rsbuild does not run. Use a
second terminal for them, and keep `bun run dev` running:

```bash
bunx vercel link
bunx vercel dev --listen 3001
```

Rsbuild proxies `/api` and `/q` to port 3001, so the page works as deployed.
Without the second terminal the generator still works and only short links show
`Link storage is not configured.`

## Database

Create a Neon project, open the SQL editor, and run [`schema.sql`](./schema.sql).
Then set these in `.env` and in the Vercel project:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon connection string. Server only, never `PUBLIC_`. |
| `IP_HASH_SALT` | Any long random string, for the per-IP rate limit. |

Links expire after 180 days. Rows are never served after expiry. Delete old
rows from the Neon SQL editor when the table grows:

```sql
delete from public.links where expires_at < now();
```

## Checks

```bash
bun run typecheck
bun run check
```

`check` decodes the generated SVG with jsQR for every module style at two
resolutions, including a high-version code with several alignment patterns and
a code with a centre logo. It also tests payload escaping and the short-link
target guard. Run it after touching `shared/`.

## API

`GET /api/qr`

| Parameter | Default | Rules |
| --- | --- | --- |
| `text` | required | Up to 1200 characters |
| `ecc` | `M` | `L`, `M`, `Q`, `H` |
| `style` | `square` | `square`, `rounded`, `dots` |
| `size` | `512` | 128 to 1024 |
| `margin` | `4` | 0 to 8 modules |
| `dark` / `light` | `#101317` / `#ffffff` | Hex colours, `#` as `%23` |

```bash
curl -o code.svg 'http://localhost:3000/api/qr?text=https%3A%2F%2Fexample.com&ecc=M&style=dots'
```

`POST /api/links` with `{ "target": "https://..." }` returns
`{ "slug": "...", "url": "https://.../q/..." }`. It only accepts same-origin
requests, public http(s) targets, and 20 links per IP per hour.

`GET /q/:slug` redirects with `302`, counts the hit, and sends `no-store`.
Unknown and expired slugs return `404`.

## Deploy

Push this folder as its own repository, then create a Vercel project from it.
The build needs no `rootDirectory` override. Set `DATABASE_URL` and
`IP_HASH_SALT` in the project's environment variables, then deploy.

`vercel.json` sends `/q/:slug` to the function and every other path to
`index.html`. Vercel resolves filesystem and function routes before the
catch-all, so `/api/*` is never swallowed.

### Domain

`adityavhlvy.vercel.app` is a project's default domain, not a domain you own, so
a subdomain of it (`qr.adityavhlvy.vercel.app`) cannot be created. This project
gets its own default domain, for example `qr-ninja.vercel.app`.

A real subdomain such as `qr.adityavhlvy.com` needs a domain you control. Add it
in Vercel under Settings, Domains, then point a CNAME at `cname.vercel-dns.com`.
No code changes are needed.

## Deliberate limits

- Short links are public to create from the UI, so they are rate limited by
  hashed IP, capped at 180 days, and validated to public http(s) only. If abuse
  appears, add a CAPTCHA or require an account.
- Stored links are not editable. Editing a destination after printing is the
  one feature that would need a claim token per link.
- No server-side PNG. The API returns SVG; the page rasterises locally so the
  server never needs a canvas binary.
