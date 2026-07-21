# www-metatron

Marketing site for Metatron. Static, no build step — plain `index.html` +
`styles.css` + `metatron.js`. Implemented from the Claude Design handoff bundle.

## Local preview

```sh
cd www-metatron
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Drop the folder on any static host (Netlify, Vercel, Cloudflare Pages, GitHub
Pages, S3, nginx). No server runtime required. The Google Fonts are loaded from
the CDN; everything else is local.

## Pages

- `index.html` — the marketing landing page.
- `docs/index.html` — the documentation page (served at `/docs`), grounded in the
  Metatron CLI/MCP surface. Note it uses **root-absolute** asset paths
  (`/styles.css`, `/docs.css`, `/metatron.js`), so it expects to be deployed at the
  domain root and previewed via a local server (not opened as a `file://`).

## Things to wire up

- **Email signup** — currently uses a **mailto fallback** to `hello@getmetatron.com`.
  To switch to a real list provider, see `metatron.js`:
  - `SIGNUP_TO` constant (the fallback address), and
  - the `TODO(provider)` block in `initEmail()` — replace the `mailto` redirect
    with a `fetch("/api/subscribe", { method: "POST", ... })`.

## Design notes

- Near-black canvas, single emerald accent (`#34d399`).
- Type: Space Grotesk (display) / Hanken Grotesk (prose) / JetBrains Mono (code).
- The Metatron's Cube (hero, brand marks, favicon) is generated in JS from the
  13-center Fruit-of-Life geometry — not a hand-drawn SVG.
- Respects `prefers-reduced-motion`; hero stacks and the pipeline goes vertical
  on mobile.
