# Deployment Guide — ioe-grade2 on Cloudflare Pages

This app is a **fully static site** (Next.js `output: "export"`, no server, no API routes,
all state in `localStorage`). It deploys to **Cloudflare Pages free tier**:
unlimited bandwidth & requests, free SSL, 500 builds/month, 20,000 files/site.
No credit card required.

Build command: `npm run build` → output directory: `out/`

---

## 1. Deploying

You have two paths. Pick one.

### Option A — Git-connected (simplest, recommended to start)
1. Push this repo to GitHub (already remote: `nangnh/english-center`).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Select the repo, then set:
   - **Framework preset:** Next.js (Static HTML Export)
   - **Build command:** `npm run build`
   - **Build output directory:** `out`
4. Save & Deploy. Every push to `main` auto-deploys. Every PR gets a preview URL.

### Option B — GitHub Actions (quality gates before deploy)
`.github/workflows/deploy.yml` runs typecheck → lint → tests → build, then deploys.
A broken build never reaches production. To enable, add two repo secrets
(**Settings → Secrets and variables → Actions**):
- `CLOUDFLARE_API_TOKEN` — create at Cloudflare → My Profile → API Tokens →
  template **"Edit Cloudflare Workers"** (or a custom token with *Account → Cloudflare Pages → Edit*).
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare dashboard right sidebar.

> Use **one** path, not both, to avoid double deploys. If you use Actions, leave the
> dashboard project's Git auto-build **off**.

### Local preview of the production build
```bash
npm run build
npx serve out        # or: python3 -m http.server -d out 8000
```

---

## 2. Managing the domain

Default URL is `https://ioe-grade2.pages.dev` (free, automatic HTTPS).

### Custom domain
1. Pages project → **Custom domains** → **Set up a domain**.
2. Enter your domain (e.g. `ioe.example.com`).
3. If the domain is **on Cloudflare**, the DNS record (CNAME → `pages.dev`) is added automatically.
   If it's on another registrar, add the CNAME it shows you at your DNS provider.
4. SSL is issued automatically within minutes. No cost.

Apex/root domains (`example.com`) work when the zone is on Cloudflare (CNAME flattening).
`www` → apex redirect is set via a Bulk Redirect or Pages' own domain settings.

---

## 3. Version & deploy management

Every deploy is **immutable** and tied to a **Git commit SHA**:
- Each commit to `main` = one production deployment.
- Each PR/branch = an isolated **preview deployment** at a unique
  `<hash>.ioe-grade2.pages.dev` URL. Safe to share for review, no effect on production.

See history: Pages project → **Deployments** tab. Each row shows the commit,
author, timestamp, and its permanent preview URL.

Tag releases locally so SHAs map to meaningful versions:
```bash
git tag -a v1.0.0 -m "First public release"
git push origin v1.0.0
```

---

## 4. Security

Baseline is handled by the platform and `public/_headers`:
- **HTTPS everywhere** — automatic, free certs, HSTS enabled via `_headers`.
- **Security headers** (in `public/_headers`, served on every response):
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, and a restrictive **CSP**.
- **No backend attack surface** — no server, no database, no API keys in the app.
  All user progress lives in the browser's `localStorage`.
- **Secrets** — the app ships none. Deploy credentials live only in GitHub Actions
  secrets / Cloudflare, never in source.

After deploy, verify headers:
```bash
curl -sI https://ioe-grade2.pages.dev | grep -i -E "content-security|x-frame|strict-transport"
```
> If you later add external resources (fonts, analytics, CDN), widen the CSP
> `connect-src`/`script-src` in `public/_headers` to match — otherwise they'll be blocked.

---

## 5. Rollback

Because deployments are immutable, rollback is instant and safe — no rebuild needed.

### Fastest: dashboard
Pages project → **Deployments** → find the last known-good deployment →
**⋯ menu** → **Rollback to this deployment**. Production points at it immediately.

### Git-based (keeps history honest)
Revert the bad commit and let CI redeploy:
```bash
git revert <bad-sha>
git push origin main
```

### Re-deploy a specific old version via Actions
Actions tab → **Deploy to Cloudflare Pages** → **Run workflow** → pick the tag/SHA.

> Note: a rollback restores the **code/assets** only. User progress in `localStorage`
> is per-browser and unaffected by deploys. The `schemaVersion` guard in
> `src/lib/storage.ts` handles data-shape changes across versions.
