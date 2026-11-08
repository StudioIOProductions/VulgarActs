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

That starts both the game server (yellow lines) and the web app (cyan lines). The web app prints two URLs; open the **Network** one (it looks like `http://192.168.x.x:5173`) on every phone that's on the same Wi-Fi. One device taps *Start a room*; the others type the four-letter code.

The first time, Wrangler (Cloudflare's local server) may ask whether it can collect anonymous usage data. Either answer is fine.

## Other commands

- `npm test` – run the rules-engine tests
- `npm run build` – production build of the web app
- `npm run server` – run only the game server
- `npm run web` – run only the web app
