import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
// In dev, the game server runs separately on :8787 (npm run server). Vite forwards
// /api and /ws to it so phones only ever talk to one address.
export default defineConfig({
  plugins: [preact()],
  server: { port: 5173, proxy: { "/api": "http://localhost:8787", "/ws": { target: "ws://localhost:8787", ws: true } } },
});
