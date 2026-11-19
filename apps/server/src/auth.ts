/**
 * Accounts: magic-link email sign-in, no passwords.
 *
 *   POST /api/auth/start   { email }        -> { ok }   emails a one-time link (15 min)
 *   GET  /api/auth/verify?t=TOKEN           -> sets the session cookie, redirects to /#account
 *   GET  /api/me                            -> { signedIn, email?, decks? }
 *   POST /api/auth/logout                   -> clears the session
 *
 * Only an email address is stored. Link and session tokens are stored as SHA-256 hashes,
 * so a copy of the database can't be used to sign in as anyone.
 */
import type { Env } from "./index";
import { DECK_SUMMARIES } from "@vulgar-acts/decks";

const LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const COOKIE = "va_session";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const randomToken = () => { const b = new Uint8Array(32); crypto.getRandomValues(b); return [...b].map((x) => x.toString(16).padStart(2, "0")).join(""); };
async function sha256(s: string) { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
const normEmail = (e: string) => e.trim().toLowerCase();
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;

function cookieValue(req: Request): string | null {
  const m = (req.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`));
  return m ? m[1] : null;
}
const setCookie = (token: string, maxAgeSec: number) => `${COOKIE}=${token}; Path=/; Max-Age=${maxAgeSec}; HttpOnly; Secure; SameSite=Lax`;

/** Who is making this request, or null. */
export async function currentAccount(req: Request, env: Env): Promise<{ id: string; email: string } | null> {
  const tok = cookieValue(req);
  if (!tok || !env.DB) return null;
  const row = await env.DB.prepare("SELECT a.id, a.email FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token_hash = ? AND s.expires_at > ?")
    .bind(await sha256(tok), Date.now()).first<{ id: string; email: string }>();
  return row ?? null;
}

/* ---------- what an account owns ----------
 * SKUs: one per paid deck (its deck id), "starter_full" for the rest of the Starter,
 * "launch" = the Launch Collection (expands to the five permanent rows when granted),
 * "pass" = the yearly Pass (expires; also grants the Launch Collection to keep).
 */
export const LAUNCH_SET = ["starter_full", "afterdark", "office", "pop", "patent"];
export const ALL_DECK_SKUS = () => DECK_SUMMARIES.filter((d) => d.id !== "starter").map((d) => d.id);

export interface AccountAccess { decks: string[]; starterFull: boolean; skus: string[]; passUntil: string | null }

export async function accountAccess(accountId: string, env: Env): Promise<AccountAccess> {
  const nowIso = new Date().toISOString();
  const rows = await env.DB.prepare("SELECT sku, expires_at FROM entitlements WHERE account_id = ? AND (expires_at IS NULL OR expires_at > ?)").bind(accountId, nowIso).all<{ sku: string; expires_at: string | null }>();
  const skus = rows.results.map((r) => r.sku);
  const pass = rows.results.find((r) => r.sku === "pass");
  const decks = new Set<string>();
  let starterFull = false;
  for (const sku of skus) {
    if (sku === "starter_full") starterFull = true;
    else if (sku === "pass") { ALL_DECK_SKUS().forEach((d) => decks.add(d)); starterFull = true; }
    else if (sku !== "launch") decks.add(sku);
  }
  return { decks: [...decks], starterFull, skus, passUntil: pass?.expires_at ?? null };
}

/** Grant a SKU. The Launch Collection and the Pass also write the five permanent rows the buyer keeps for good. */
export async function grant(env: Env, accountId: string, sku: string, source: string, expiresAt: string | null = null): Promise<void> {
  const now = new Date().toISOString();
  const put = (k: string, exp: string | null) => env.DB.prepare("INSERT INTO entitlements (account_id, sku, source, granted_at, expires_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(account_id, sku) DO UPDATE SET expires_at = excluded.expires_at, source = excluded.source, granted_at = excluded.granted_at").bind(accountId, k, source, now, exp).run();
  if (sku === "launch" || sku === "pass") for (const k of LAUNCH_SET) await put(k, null);
  if (sku === "pass") await put("pass", expiresAt ?? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString());
  else if (sku !== "launch") await put(sku, expiresAt);
}

export async function findOrCreateAccount(env: Env, email: string): Promise<string> {
  const e = normEmail(email);
  const row = await env.DB.prepare("SELECT id FROM accounts WHERE email = ?").bind(e).first<{ id: string }>();
  if (row) return row.id;
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO accounts (id, email, created_at, last_seen_at) VALUES (?, ?, ?, ?)").bind(id, e, new Date().toISOString(), null).run();
  return id;
}

async function sendLink(env: Env, email: string, link: string, code: string): Promise<{ sent: boolean; devLink?: string }> {
  if (!env.RESEND_KEY) {
    // No mail provider configured (local dev): hand the link back so the flow can still be tested.
    console.log(`[auth] magic link for ${email}: ${link}`);
    return { sent: false, devLink: link };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.MAIL_FROM ?? "Vulgar Acts <info@vulgaracts.com>",
      to: [email],
      subject: `${code} is your Vulgar Acts sign-in code`,
      text: `Your Vulgar Acts sign-in code is ${code}\n\nGo back to the Vulgar Acts page that asked for it and type the code there.\n\nIt works once and expires in 15 minutes. If you didn't ask for this, ignore it; nothing happens.\n\n(Reading this in the same browser as the game? This link signs that browser in: ${link})\n\n— Studio IO`,
      html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#121212"><p>Your <b>Vulgar Acts</b> sign-in code:</p><p style="font-size:36px;font-weight:800;letter-spacing:.18em;margin:8px 0 16px">${code}</p><p><b>Go back to the Vulgar Acts page that asked for it and type the code there.</b></p><p style="color:#5A6B74;font-size:14px">It works once and expires in 15 minutes. If you didn't ask for this, ignore it; nothing happens.</p><p style="color:#8a949a;font-size:12px">Reading this in the same browser as the game? <a href="${link}" style="color:#8a949a">This link</a> signs that browser in instead.</p><p style="color:#5A6B74;font-size:14px">— Studio IO</p></div>`,
    }),
  });
  if (!res.ok) { console.error("[auth] resend failed", res.status, await res.text()); return { sent: false }; }
  return { sent: true };
}

/** Find or create the account for an email and open a session; returns the raw session token. */
async function openSession(env: Env, email: string, now: number): Promise<string> {
  const id = await findOrCreateAccount(env, email);
  await env.DB.prepare("UPDATE accounts SET last_seen_at = ? WHERE id = ?").bind(new Date().toISOString(), id).run();
  const session = randomToken();
  await env.DB.prepare("INSERT INTO sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(await sha256(session), id, now, now + SESSION_TTL_MS).run();
  return session;
}

export async function handleAuth(req: Request, env: Env, url: URL): Promise<Response | null> {
  if (!env.DB) return json({ error: "accounts are not set up on this server" }, 503);
  const now = Date.now();
  const origin = url.origin; // the real domain in production; under `wrangler dev` the dev link is returned relative instead

  if (url.pathname === "/api/auth/start" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    const email = normEmail(body.email ?? "");
    if (!validEmail(email)) return json({ error: "That doesn't look like an email address." }, 400);
    const last = await env.DB.prepare("SELECT created_at FROM magic_links WHERE email = ? ORDER BY created_at DESC LIMIT 1").bind(email).first<{ created_at: number }>();
    if (last && now - last.created_at < RESEND_COOLDOWN_MS) return json({ ok: true, cooldown: true });
    const token = randomToken();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await env.DB.prepare("INSERT INTO magic_links (token_hash, email, created_at, expires_at, code_hash) VALUES (?, ?, ?, ?, ?)").bind(await sha256(token), email, now, now + LINK_TTL_MS, await sha256(email + ":" + code)).run();
    const link = `${origin}/api/auth/verify?t=${token}`;
    const r = await sendLink(env, email, link, code);
    if (!r.sent && !r.devLink) return json({ error: "Couldn't send the email just now. Try again in a minute." }, 502);
    return json({ ok: true, ...(r.devLink ? { devLink: `/api/auth/verify?t=${token}`, devCode: code } : {}) });
  }

  // Typed code: same as tapping the link, but in the browser that asked. Five tries per code.
  if (url.pathname === "/api/auth/code" && req.method === "POST") {
    const body = (await req.json().catch(() => ({}))) as { email?: string; code?: string };
    const email = normEmail(body.email ?? "");
    const code = (body.code ?? "").replace(/\D/g, "");
    if (!validEmail(email) || code.length !== 6) return json({ error: "Enter the six digits from the email." }, 400);
    const link = await env.DB.prepare("SELECT token_hash, code_hash, expires_at, used_at, attempts FROM magic_links WHERE email = ? ORDER BY created_at DESC LIMIT 1").bind(email).first<{ token_hash: string; code_hash: string | null; expires_at: number; used_at: number | null; attempts: number }>();
    if (!link || !link.code_hash || link.used_at) return json({ error: "That code was already used or never sent. Ask for a new one." }, 400);
    if (link.expires_at < now) return json({ error: "That code expired. Ask for a new one." }, 400);
    if (link.attempts >= 5) return json({ error: "Too many tries. Ask for a new code." }, 429);
    if (link.code_hash !== await sha256(email + ":" + code)) {
      await env.DB.prepare("UPDATE magic_links SET attempts = attempts + 1 WHERE token_hash = ?").bind(link.token_hash).run();
      return json({ error: "That's not it. Check the digits." }, 400);
    }
    await env.DB.prepare("UPDATE magic_links SET used_at = ? WHERE token_hash = ?").bind(now, link.token_hash).run();
    const session = await openSession(env, email, now);
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "set-cookie": setCookie(session, SESSION_TTL_MS / 1000) } });
  }

  if (url.pathname === "/api/auth/verify" && req.method === "GET") {
    const t = url.searchParams.get("t") ?? "";
    const fail = (why: string) => new Response(null, { status: 302, headers: { location: `/#account?err=${why}` } });
    if (!/^[a-f0-9]{64}$/.test(t)) return fail("bad");
    const h = await sha256(t);
    const link = await env.DB.prepare("SELECT email, expires_at, used_at FROM magic_links WHERE token_hash = ?").bind(h).first<{ email: string; expires_at: number; used_at: number | null }>();
    if (!link || link.used_at) return fail("used");
    if (link.expires_at < now) return fail("expired");
    await env.DB.prepare("UPDATE magic_links SET used_at = ? WHERE token_hash = ?").bind(now, h).run();
    const session = await openSession(env, link.email, now);
    return new Response(null, { status: 302, headers: { location: `/#account`, "set-cookie": setCookie(session, SESSION_TTL_MS / 1000) } });
  }

  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    const tok = cookieValue(req);
    if (tok) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(tok)).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", "set-cookie": setCookie("", 0) } });
  }

  if (url.pathname === "/api/me" && req.method === "GET") {
    const acct = await currentAccount(req, env);
    if (!acct) return json({ signedIn: false });
    const a = await accountAccess(acct.id, env);
    return json({ signedIn: true, email: acct.email, decks: a.decks, starterFull: a.starterFull, skus: a.skus, passUntil: a.passUntil });
  }

  /* ---------- admin: hand out decks before the store exists ----------
   *   POST /api/admin/grant  header x-admin-key   { email, sku, expiresAt? }
   *   GET  /api/admin/accounts  header x-admin-key  -> recent accounts and what they own
   */
  if (url.pathname.startsWith("/api/admin/")) {
    if (!env.ADMIN_KEY || req.headers.get("x-admin-key") !== env.ADMIN_KEY) return json({ error: "nope" }, 403);
    if (url.pathname === "/api/admin/grant" && req.method === "POST") {
      const b = (await req.json().catch(() => ({}))) as { email?: string; sku?: string; expiresAt?: string };
      const valid = ["launch", "pass", ...LAUNCH_SET, ...ALL_DECK_SKUS()];
      if (!b.email || !validEmail(normEmail(b.email))) return json({ error: "email?" }, 400);
      if (!b.sku || !valid.includes(b.sku)) return json({ error: `sku must be one of ${valid.join(", ")}` }, 400);
      const id = await findOrCreateAccount(env, b.email);
      await grant(env, id, b.sku, "admin", b.expiresAt ?? null);
      return json({ ok: true, email: normEmail(b.email), access: await accountAccess(id, env) });
    }
    if (url.pathname === "/api/admin/accounts" && req.method === "GET") {
      const rows = await env.DB.prepare("SELECT a.email, a.created_at, a.last_seen_at, GROUP_CONCAT(e.sku) AS skus FROM accounts a LEFT JOIN entitlements e ON e.account_id = a.id GROUP BY a.id ORDER BY a.created_at DESC LIMIT 200").all();
      return json(rows.results);
    }
    return json({ error: "not found" }, 404);
  }

  return null;
}
