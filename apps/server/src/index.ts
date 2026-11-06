/**
 * Vulgar Acts game server: a Cloudflare Worker with one Durable Object per room.
 * Beat 1: health check only. Beat 3 gives Room its WebSocket and state.
 */
import { makeRoomCode } from "@vulgar-acts/engine";

export interface Env { ROOMS: DurableObjectNamespace }

export class Room {
  constructor(private state: DurableObjectState, private env: Env) {}
  async fetch(_req: Request): Promise<Response> {
    return new Response(JSON.stringify({ ok: true, room: this.state.id.toString() }), { headers: { "content-type": "application/json" } });
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/health") return Response.json({ ok: true, sampleCode: makeRoomCode() });
    const m = url.pathname.match(/^\/room\/([A-Z]{4})$/);
    if (m) return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
    return new Response("Vulgar Acts server", { status: 200 });
  },
};
