# Smart Farm web app

Next.js 16 app (TypeScript, Tailwind, shadcn/ui) for the Smart Farm demo. It is an installable PWA.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

Setup, Firebase configuration, the optional `GEMINI_API_KEY` for the disease scanner, and the full project overview are in the [main README](../README.md).

## Structure

| Path | Purpose |
|---|---|
| `app/dashboard/*` | Overview, Irrigation, Analytics, Weather, Alerts, Reports, Disease scanner, Settings |
| `app/api/scan` | Server route that calls Gemini (checks the Firebase sign-in first) |
| `app/login` | Sign in, register, reset password |
| `hooks/` | Auth, live farm data, history, weather |
| `lib/` | Zone and alert logic, history bucketing, PDF and CSV reports, weather client |
| `components/` | UI built on shadcn/ui |
| `public/sw.js` | Service worker (offline app shell, production only) |

This project uses a recent Next.js with breaking changes. Read `node_modules/next/dist/docs/` before changing framework-level code.
