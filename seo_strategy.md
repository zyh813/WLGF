# SEO Strategy

## Project overview
CyberShield (网络攻防平台) — a React SPA cybersecurity SOC (Security Operations Center) platform with an Express API backend. All routes are client-rendered via Wouter. The app surfaces a dashboard, alerts, firewall, connections, scans, and logs sections.

## Rendering mode
Pure SPA (React + Wouter + Vite). The only HTML that crawlers and social bots receive is the `artifacts/cyber-shield/index.html` shell containing `<div id="root"></div>`. No SSR or SSG is in place.

## In scope
- Public HTML shell (`artifacts/cyber-shield/index.html`)
- `public/robots.txt`, `public/favicon.svg`
- All routes served through the SPA shell

## Out of scope
- Authenticated internal dashboard pages (Dashboard, Alerts, Firewall, Connections, Scans, Logs) — these are internal SOC tool pages, not public marketing pages, so per-route SEO metadata is not expected
- API server (`artifacts/api-server`) — backend only, no HTML pages

## Target audience
Internal security analysts / SOC teams (primary). Potentially discoverable publicly.

## Primary keywords
Unknown — update once known.

## Dismissed categories
- (None yet)
