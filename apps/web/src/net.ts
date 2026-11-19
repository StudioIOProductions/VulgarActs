/**
 * Phone <-> room server connection. One per page. Reconnects on drop and
 * re-joins with the same seat, so a refresh or a Wi-Fi blip keeps your place.
 */
import type { ClientMsg, ServerMsg, ActionName, PlayerView } from "../../server/src/protocol";

const ls = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch {} },
};

/** A stable id for this device, so reconnects land in the same seat. */
export function myPid(): string {
  let pid = ls.get("va_pid");
  if (!pid) { pid = "p" + Math.random().toString(36).slice(2, 10); ls.set("va_pid", pid); }
  return pid;
}
export const savedName = () => ls.get("va_name") ?? "";
export const saveName = (n: string) => ls.set("va_name", n);
export const savedAvatar = () => Number(ls.get("va_avatar") ?? 0) || 0;
export const saveAvatar = (a: number) => ls.set("va_avatar", String(a));

const base = () => {
  const env = (import.meta as any).env?.VITE_SERVER_URL as string | undefined;
  if (env) return env.replace(/\/$/, "");
  return ""; // same origin; vite proxies /api and /ws in dev
};
const wsBase = () => {
  const b = base();
  if (b) return b.replace(/^http/, "ws");
  const l = location;
  return (l.protocol === "https:" ? "wss://" : "ws://") + l.host;
};

export async function createRoom(host: string): Promise<string> {
  const r = await fetch(base() + "/api/rooms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ host }) });
  if (!r.ok) throw new Error("could not create room");
  return ((await r.json()) as { code: string }).code;
}

export interface RoomInfo { ok: boolean; phase?: string; players?: { id: string; name: string }[] }
export async function roomInfo(code: string): Promise<RoomInfo> {
  try { const r = await fetch(base() + `/api/rooms/${code}`); return r.ok ? ((await r.json()) as RoomInfo) : { ok: false }; } catch { return { ok: false }; }
}
export async function roomExists(code: string): Promise<boolean> { return (await roomInfo(code)).ok; }

type Listener = (m: ServerMsg) => void;

export class Connection {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private closed = false;
  private retry = 0;
  view: PlayerView | null = null;
  /** Server clock offset so timers agree across phones. */
  skew = 0;
  status: "connecting" | "open" | "reconnecting" | "closed" = "connecting";

  constructor(public code: string, public pid: string, public name: string, public avatar = 0, public watch = false) { this.open(); }

  private open() {
    this.ws = new WebSocket(`${wsBase()}/ws/${this.code}`);
    this.ws.onopen = () => {
      this.status = "open"; this.retry = 0;
      if (this.watch) this.raw({ t: "watch", pid: this.pid }); else this.raw({ t: "join", pid: this.pid, name: this.name, avatar: this.avatar });
      this.raw({ t: "ping" });
    };
    this.ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data) as ServerMsg;
      if (m.t === "view") { this.view = m.view; this.skew = m.now - Date.now(); }
      if (m.t === "pong") this.skew = m.now - Date.now();
      this.listeners.forEach((l) => l(m));
    };
    this.ws.onclose = () => {
      if (this.closed) return;
      this.status = "reconnecting";
      this.listeners.forEach((l) => l({ t: "error", code: "reconnecting" }));
      const wait = Math.min(8000, 500 * 2 ** this.retry++);
      setTimeout(() => this.open(), wait);
    };
    this.ws.onerror = () => this.ws?.close();
  }

  on(l: Listener) { this.listeners.add(l); return () => this.listeners.delete(l); }
  private raw(m: ClientMsg) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m)); }
  action(name: ActionName, args?: Record<string, unknown>) { this.raw({ t: "action", name, args }); }
  now() { return Date.now() + this.skew; }
  close() { this.closed = true; this.status = "closed"; this.ws?.close(); }
}

/* ---------- accounts ---------- */

export type Me = { signedIn: false } | { signedIn: true; email: string; decks: string[]; starterFull: boolean; skus: string[]; passUntil: string | null };

export async function me(): Promise<Me> {
  try { const r = await fetch(base() + "/api/me", { credentials: "include" }); return r.ok ? r.json() : { signedIn: false }; } catch { return { signedIn: false }; }
}
export async function startSignIn(email: string): Promise<{ ok: true; devLink?: string; devCode?: string; cooldown?: boolean } | { ok: false; error: string }> {
  try {
    const r = await fetch(base() + "/api/auth/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const j = await r.json();
    return r.ok ? { ok: true, ...j } : { ok: false, error: j.error ?? "Something went wrong." };
  } catch { return { ok: false, error: "No connection." }; }
}
export async function submitCode(email: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const r = await fetch(base() + "/api/auth/code", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code }) });
    const j = await r.json();
    return r.ok ? { ok: true } : { ok: false, error: j.error ?? "Something went wrong." };
  } catch { return { ok: false, error: "No connection." }; }
}
export async function signOut(): Promise<void> {
  try { await fetch(base() + "/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
}

/* ---------- store ---------- */

export type Catalog = { prices: Record<string, { cents: number; recurring: "year" | null }>; founders: { limit: number; left: number; sku: string }; live: boolean };
export async function catalog(): Promise<Catalog | null> {
  try { const r = await fetch(base() + "/api/store/catalog"); return r.ok ? r.json() : null; } catch { return null; }
}
async function postJson<T>(path: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  try {
    const r = await fetch(base() + path, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, data: j as T } : { ok: false, error: (j as { error?: string }).error ?? "Something went wrong.", status: r.status };
  } catch { return { ok: false, error: "No connection.", status: 0 }; }
}
export const checkout = (sku: string) => postJson<{ url: string }>("/api/store/checkout", { sku });
export const portal = () => postJson<{ url: string }>("/api/store/portal");
export const claimFounders = () => postJson<{ ok: true; already?: boolean }>("/api/store/founders");
