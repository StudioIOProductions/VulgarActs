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

/** Deck ids an account may use. Starter is everyone's; the rest come from entitlements. */
export async function ownedDecks(accountId: string, env: Env): Promise<string[]> {
  const rows = await env.DB.prepare("SELECT sku FROM entitlements WHERE account_id = ? AND (expires_at IS NULL OR expires_at > ?)").bind(accountId, new Date().toISOString()).all<{ sku: string }>();
  return rows.results.map((r) => r.sku);
}

async function sendLink(env: Env, email: string, link: string): Promise<{ sent: boolean; devLink?: string }> {
  if (!env.RESEND_KEY) {
    // No mail provider configured (local dev): hand the link back so the flow can still be tested.
    console.log(`[auth] magic link for ${email}: ${link}`);
    return { sent: false, devLink: link };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.MAIL_FROM ?? "Vulgar Acts <login@vulgaracts.com>",
      to: [email],
      subject: "Your Vulgar Acts sign-in link",
      text: `Tap to sign in to Vulgar Acts:\n\n${link}\n\nThe link works once and expires in 15 minutes. If you didn't ask for it, ignore this email; nothing happens.\n\n— Studio IO`,
      html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#121212"><p>Tap to sign in to <b>Vulgar Acts</b>:</p><p><a href="${link}" style="display:inline-block;background:#E3261D;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border:3px solid #121212">Sign me in</a></p><p style="color:#5A6B74;font-size:14px">The link works once and expires in 15 minutes. If you didn't ask for it, ignore this email; nothing happens.</p><p style="color:#5A6B74;font-size:14px">— Studio IO</p></div>`,
    }),
  });
  if (!res.ok) { console.error("[auth] resend failed", res.status, await res.text()); return { sent: false }; }
  return { sent: true };
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
    await env.DB.prepare("INSERT INTO magic_links (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(await sha256(token), email, now, now + LINK_TTL_MS).run();
    const link = `${origin}/api/auth/verify?t=${token}`;
    const r = await sendLink(env, email, link);
    if (!r.sent && !r.devLink) return json({ error: "Couldn't send the email just now. Try again in a minute." }, 502);
    return json({ ok: true, ...(r.devLink ? { devLink: `/api/auth/verify?t=${token}` } : {}) });
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
    // Find or create the account.
    let acct = await env.DB.prepare("SELECT id FROM accounts WHERE email = ?").bind(link.email).first<{ id: string }>();
    if (!acct) {
      const id = crypto.randomUUID();
      await env.DB.prepare("INSERT INTO accounts (id, email, created_at, last_seen_at) VALUES (?, ?, ?, ?)").bind(id, link.email, new Date().toISOString(), new Date().toISOString()).run();
      acct = { id };
    } else {
      await env.DB.prepare("UPDATE accounts SET last_seen_at = ? WHERE id = ?").bind(new Date().toISOString(), acct.id).run();
    }
    const session = randomToken();
    await env.DB.prepare("INSERT INTO sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(await sha256(session), acct.id, now, now + SESSION_TTL_MS).run();
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
    return json({ signedIn: true, email: acct.email, decks: await ownedDecks(acct.id, env) });
  }

  return null;
}
