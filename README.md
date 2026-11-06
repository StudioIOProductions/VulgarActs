# Vulgar Acts

The party game app. Rules, decks and the build plan live in the design doc; code lives here.

## Layout

- `apps/web` – the phone and host pages (Vite + Preact + TypeScript)
- `apps/server` – the game server (Cloudflare Worker, one Durable Object per room)
- `packages/engine` – the rules, as pure functions with tests

## Run it on your phone

```
git pull
npm install
npm run dev
```

Vite prints two URLs. Open the **Network** one (it looks like `http://192.168.x.x:5173`) on a phone that's on the same Wi-Fi.

## Other commands

- `npm test` – run the rules-engine tests
- `npm run build` – production build of the web app
- `npm run server` – run the game server locally (needs Cloudflare's Wrangler; Beat 3)
