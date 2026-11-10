/**
 * Vulgar Acts game server: a Cloudflare Worker with one Durable Object per room.
 *
 *   POST /api/rooms            -> { code }   mint a room; body { host: pid }
 *   GET  /api/rooms/:code      -> { ok, phase, players }  does it exist?
 *   WS   /ws/:code             -> the room's socket; first message must be { t: "join" }
 *
 * The Room object owns the GameState, applies engine actions, runs the clock
 * with an alarm, and pushes each player's own view after every change.
 */
import * as E from "@vulgar-acts/engine";
import type { GameState } from "@vulgar-acts/engine";
import type { ClientMsg, ServerMsg, ActionName } from "./protocol";
import { PLACEHOLDER_CARDS, PLACEHOLDER_GROUPS } from "./placeholder-deck";

export interface Env { ROOMS: DurableObjectNamespace }

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST", "access-control-allow-headers": "content-type" } });
    if (url.pathname === "/health") return json({ ok: true });

    if (url.pathname === "/api/rooms" && req.method === "POST") {
      const body = (await req.json().catch(() => ({}))) as { host?: string };
      if (!body.host) return json({ error: "host required" }, 400);
      // Mint until we find a code whose room is empty (collisions are rare but cheap to avoid).
      for (let i = 0; i < 5; i++) {
        const code = E.makeRoomCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const res = await stub.fetch("https://room/init", { method: "POST", body: JSON.stringify({ code, host: body.host }) });
        if (res.ok) return json({ code });
      }
      return json({ error: "could not mint a code" }, 503);
    }

    let m = url.pathname.match(/^\/api\/rooms\/([A-Za-z]{4})$/);
    if (m) return env.ROOMS.get(env.ROOMS.idFromName(m[1].toUpperCase())).fetch("https://room/info");

    m = url.pathname.match(/^\/ws\/([A-Za-z]{4})$/);
    if (m) {
      if (req.headers.get("upgrade") !== "websocket") return json({ error: "expected websocket" }, 426);
      return env.ROOMS.get(env.ROOMS.idFromName(m[1].toUpperCase())).fetch(req);
    }
    return new Response("Vulgar Acts server", { status: 200 });
  },
};

interface Attachment { pid: string | null }

export class Room {
  private game: GameState | null = null;

  constructor(private ctx: DurableObjectState, private env: Env) {
    ctx.blockConcurrencyWhile(async () => {
      this.game = (await ctx.storage.get<GameState>("game")) ?? null;
    });
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/init") {
      if (this.game && this.game.phase !== "final" && Object.values(this.game.players).some((p) => p.connected)) {
        return json({ error: "taken" }, 409);
      }
      const { code, host } = (await req.json()) as { code: string; host: string };
      this.game = E.createGame(code, host);
      await this.save();
      return json({ ok: true, code });
    }
    if (url.pathname === "/info") {
      if (!this.game) return json({ ok: false }, 404);
      return json({ ok: true, code: this.game.code, phase: this.game.phase, players: E.playerList(this.game).map((p) => p.name) });
    }
    if (req.headers.get("upgrade") === "websocket") {
      if (!this.game) return json({ error: "no such room" }, 404);
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ pid: null } satisfies Attachment);
      return new Response(null, { status: 101, webSocket: client });
    }
    return json({ error: "not found" }, 404);
  }

  /* ---------- sockets ---------- */

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    let msg: ClientMsg;
    try { msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw)); } catch { return this.send(ws, { t: "error", code: "bad_json" }); }
    if (!this.game) return this.send(ws, { t: "error", code: "no_room" });
    const att = ws.deserializeAttachment() as Attachment;

    if (msg.t === "ping") return this.send(ws, { t: "pong", now: Date.now() });

    if (msg.t === "join") {
      try {
        this.game = E.join(this.game, msg.pid, msg.name, this.ctxNow(), msg.avatar ?? 0);
      } catch (e) { return this.sendErr(ws, e); }
      ws.serializeAttachment({ pid: msg.pid } satisfies Attachment);
      await this.commit();
      return;
    }

    if (msg.t === "watch") {
      ws.serializeAttachment({ pid: msg.pid } satisfies Attachment);
      this.send(ws, { t: "view", view: E.viewFor(this.game, msg.pid), now: Date.now() });
      return;
    }

    if (msg.t === "action") {
      if (!att.pid) return this.send(ws, { t: "error", code: "join_first" });
      try {
        const before = this.game;
        this.game = this.apply(this.game, att.pid, msg.name, msg.args ?? {});
        if (msg.name === "buzz" && this.game !== before) this.broadcastRaw({ t: "buzz", by: att.pid, at: Date.now() });
      } catch (e) { return this.sendErr(ws, e); }
      await this.commit();
    }
  }

  async webSocketClose(ws: WebSocket) {
    const att = ws.deserializeAttachment() as Attachment;
    if (att.pid && this.game) {
      // Only mark disconnected if no other socket for this pid remains (same player on two tabs).
      const still = this.ctx.getWebSockets().some((o) => o !== ws && (o.deserializeAttachment() as Attachment).pid === att.pid);
      if (!still) { this.game = E.setConnected(this.game, att.pid, false); await this.commit(); }
    }
  }
  async webSocketError(ws: WebSocket) { return this.webSocketClose(ws); }

  /* ---------- clock ---------- */

  async alarm() {
    if (!this.game) return;
    const next = E.tick(this.game, this.ctxNow());
    if (next !== this.game) { this.game = next; await this.commit(); }
    else await this.scheduleAlarm();
  }

  private async scheduleAlarm() {
    const t = this.game?.turn;
    if (this.game?.phase === "turn" && t) {
      if (t.status === "live") return this.ctx.storage.setAlarm(t.endsAt + 50);
      if (t.status === "paused" && t.pausedBy === "giver") return this.ctx.storage.setAlarm(t.pausedAt + E.GIVER_PAUSE_MS + 50);
    }
    await this.ctx.storage.deleteAlarm();
  }

  /* ---------- actions ---------- */

  private apply(g: GameState, pid: string, name: ActionName, a: Record<string, any>): GameState {
    const c = this.ctxNow();
    const host = () => { if (pid !== g.host) throw new E.RuleError("host_only"); };
    switch (name) {
      case "settings": host(); return E.updateSettings(g, a.patch ?? {});
      case "deal": host(); return E.deal(g, PLACEHOLDER_CARDS, PLACEHOLDER_GROUPS, c);
      case "redraw": return E.redrawHand(g, pid, c);
      case "lock": return E.lockPicks(g, pid, a.picks ?? []);
      case "start": host(); if (!a.force && !E.allLocked(g)) throw new E.RuleError("not_all_locked"); return E.startGame(g, c);
      case "announce": host(); return E.announceTurn(g);
      case "skipGiver": host(); return E.skipGiver(g);
      case "startTurn": return E.startTurn(g, pid, c);
      case "gotIt": return E.gotIt(g, pid, c, a.guesser);
      case "skip": return E.skip(g, pid, c);
      case "buzz": return E.buzz(g, pid, c);
      case "pause": return E.pause(g, pid, c);
      case "resume": return E.resume(g, pid, c);
      case "endTurn": host(); return E.endTurn(g, "forced", c);
      case "continue": host(); return E.continueGame(g, c);
      case "playAgain": host(); return E.playAgain(g);
      case "remove": host(); return E.removePlayer(g, a.pid);
      case "renameTeam": host(); return E.renameTeam(g, a.team, a.name);
      case "moveTeam": host(); return E.movePlayerToTeam(g, a.pid, a.team);
      case "shuffleTeams": host(); return E.shuffleTeams(g, c);
      case "leave": return E.removePlayer(g, pid);
      default: throw new E.RuleError("unknown_action", String(name));
    }
  }

  /* ---------- plumbing ---------- */

  private ctxNow() { return { now: Date.now(), random: Math.random }; }
  private async save() { if (this.game) await this.ctx.storage.put("game", this.game); }
  private async commit() { await this.save(); await this.scheduleAlarm(); this.broadcast(); }

  private send(ws: WebSocket, m: ServerMsg) { try { ws.send(JSON.stringify(m)); } catch {} }
  private sendErr(ws: WebSocket, e: unknown) {
    const code = e instanceof E.RuleError ? e.code : "internal";
    this.send(ws, { t: "error", code, message: e instanceof Error ? e.message : String(e) });
  }
  private broadcastRaw(m: ServerMsg) { for (const ws of this.ctx.getWebSockets()) this.send(ws, m); }
  private broadcast() {
    if (!this.game) return;
    const now = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as Attachment;
      if (!att.pid) continue;
      this.send(ws, { t: "view", view: E.viewFor(this.game, att.pid), now });
    }
  }
}
