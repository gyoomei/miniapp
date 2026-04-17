# Cloudflare deployment mode

Use this project as a static Pages-style build, not `wrangler deploy`.

## Recommended settings
- Build command: `npm run build`
- Deploy command: leave empty if Cloudflare supports it, otherwise `npm run build`
- Output directory: `dist`
- Root directory: repo root

## Important
Do not use `npx wrangler deploy` for this project.
Do not use `npm run deploy` if your Cloudflare project expects a Worker deploy.
This app should publish the built `dist/` output directly.
