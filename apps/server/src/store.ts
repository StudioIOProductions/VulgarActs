/**
 * The store. Stripe Checkout does the paying; a webhook tells us when it's done; we grant entitlements.
 *
 *   GET  /api/store/catalog              -> prices and the founders count (public)
 *   POST /api/store/checkout { sku }     -> { url }  Stripe Checkout page (signed in)
 *   POST /api/store/portal               -> { url }  Stripe billing portal: manage/cancel the Pass (signed in)
 *   POST /api/store/founders             -> claim the founders deal (signed in, first FOUNDERS_LIMIT accounts)
 *   POST /api/stripe/webhook             -> Stripe -> us. Verified with STRIPE_WEBHOOK_SECRET.
 *
 * No Stripe SDK: the Worker talks to Stripe's REST API with fetch, form-encoded.
 */
import type { Env } from "./index";
import { currentAccount, grant, accountAccess, LAUNCH_SET } from "./auth";

export const FOUNDERS_LIMIT = 500;
export const FOUNDERS_SKU = "afterdark";

/** Everything for sale. Prices in cents. The Pass is the one subscription. */
export const CATALOG: Record<string, { name: string; cents: number; recurring?: "year"; description: string }> = {
  starter_full: { name: "Vulgar Acts — Full Starter", cents: 499, description: "All 286 Starter cards. One time." },
  afterdark: { name: "Vulgar Acts — After Dark", cents: 299, description: "The 18+ deck. One time." },
  office: { name: "Vulgar Acts — Office Party", cents: 299, description: "One time." },
  pop: { name: "Vulgar Acts — Pop Culture Trash", cents: 299, description: "One time." },
  patent: { name: "Vulgar Acts — Patent Rejected", cents: 299, description: "One time." },
  launch: { name: "Vulgar Acts — Launch Collection", cents: 1499, description: "Full Starter + After Dark + Office Party + Pop Culture Trash + Patent Rejected. Yours forever." },
  pass: { name: "Vulgar Acts Pass", cents: 1999, recurring: "year", description: "The Launch Collection to keep, plus every new deck while you're a member." },
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

/** Stripe's API wants application/x-www-form-urlencoded with bracketed nested keys. */
function form(obj: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((item, i) => out.push(...(typeof item === "object" ? form(item as Record<string, unknown>, `${key}[${i}]`) : [`${key}[${i}]=${encodeURIComponent(String(item))}`])));
    else if (typeof v === "object") out.push(...form(v as Record<string, unknown>, key));
    else out.push(`${key}=${encodeURIComponent(String(v))}`);
  }
  return out;
}
async function stripe(env: Env, path: string, body?: Record<string, unknown>): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" },
    body: body ? form(body).join("&") : undefined,
  });
  const j = (await res.json()) as any;
  if (!res.ok) { console.error("[stripe]", path, res.status, JSON.stringify(j.error ?? j)); throw new Error(j.error?.message ?? "stripe error"); }
  return j;
}

async function foundersClaimed(env: Env): Promise<number> {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM entitlements WHERE source = 'founders'").first<{ n: number }>();
  return r?.n ?? 0;
}

async function customerFor(env: Env, acct: { id: string; email: string }): Promise<string> {
  const row = await env.DB.prepare("SELECT stripe_customer FROM accounts WHERE id = ?").bind(acct.id).first<{ stripe_customer: string | null }>();
  if (row?.stripe_customer) return row.stripe_customer;
  const c = await stripe(env, "customers", { email: acct.email, metadata: { account_id: acct.id } });
  await env.DB.prepare("UPDATE accounts SET stripe_customer = ? WHERE id = ?").bind(c.id, acct.id).run();
  return c.id;
}

export async function handleStore(req: Request, env: Env, url: URL): Promise<Response | null> {
  if (!env.DB) return json({ error: "store not set up" }, 503);

  if (url.pathname === "/api/store/catalog" && req.method === "GET") {
    const claimed = await foundersClaimed(env);
    return json({ prices: Object.fromEntries(Object.entries(CATALOG).map(([k, v]) => [k, { cents: v.cents, recurring: v.recurring ?? null }])), founders: { limit: FOUNDERS_LIMIT, left: Math.max(0, FOUNDERS_LIMIT - claimed), sku: FOUNDERS_SKU }, live: !!env.STRIPE_SECRET_KEY });
  }

  if (url.pathname === "/api/store/founders" && req.method === "POST") {
    const acct = await currentAccount(req, env);
    if (!acct) return json({ error: "sign_in" }, 401);
    const already = await env.DB.prepare("SELECT 1 FROM entitlements WHERE account_id = ? AND source = 'founders'").bind(acct.id).first();
    if (already) return json({ ok: true, already: true, access: await accountAccess(acct.id, env) });
    if ((await foundersClaimed(env)) >= FOUNDERS_LIMIT) return json({ error: "founders_over" }, 410);
    await grant(env, acct.id, FOUNDERS_SKU, "founders");
    return json({ ok: true, access: await accountAccess(acct.id, env) });
  }

  if (url.pathname === "/api/store/checkout" && req.method === "POST") {
    if (!env.STRIPE_SECRET_KEY) return json({ error: "The store isn't open yet." }, 503);
    const acct = await currentAccount(req, env);
    if (!acct) return json({ error: "sign_in" }, 401);
    const { sku } = (await req.json().catch(() => ({}))) as { sku?: string };
    const item = sku ? CATALOG[sku] : undefined;
    if (!sku || !item) return json({ error: "unknown sku" }, 400);
    const access = await accountAccess(acct.id, env);
    if (access.skus.includes(sku) || (sku === "launch" && LAUNCH_SET.every((k) => access.skus.includes(k)))) return json({ error: "You already own that." }, 409);
    const customer = await customerFor(env, acct);
    const origin = url.origin;
    const session = await stripe(env, "checkout/sessions", {
      mode: item.recurring ? "subscription" : "payment",
      customer,
      client_reference_id: acct.id,
      metadata: { account_id: acct.id, sku },
      ...(item.recurring ? { subscription_data: { metadata: { account_id: acct.id, sku } } } : {}),
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: item.cents, product_data: { name: item.name, description: item.description }, ...(item.recurring ? { recurring: { interval: item.recurring } } : {}) } }],
      success_url: `${origin}/#store?done=${sku}`,
      cancel_url: `${origin}/#store`,
      allow_promotion_codes: true,
    });
    return json({ url: session.url });
  }

  if (url.pathname === "/api/store/portal" && req.method === "POST") {
    if (!env.STRIPE_SECRET_KEY) return json({ error: "The store isn't open yet." }, 503);
    const acct = await currentAccount(req, env);
    if (!acct) return json({ error: "sign_in" }, 401);
    const customer = await customerFor(env, acct);
    const s = await stripe(env, "billing_portal/sessions", { customer, return_url: `${url.origin}/#account` });
    return json({ url: s.url });
  }

  if (url.pathname === "/api/stripe/webhook" && req.method === "POST") {
    const payload = await req.text();
    if (!(await verifyStripeSignature(payload, req.headers.get("stripe-signature") ?? "", env.STRIPE_WEBHOOK_SECRET ?? ""))) return json({ error: "bad signature" }, 400);
    const event = JSON.parse(payload) as { id: string; type: string; data: { object: any } };
    const seen = await env.DB.prepare("SELECT 1 FROM purchases WHERE id = ?").bind(event.id).first();
    if (seen) return json({ ok: true, dup: true });
    const o = event.data.object;

    if (event.type === "checkout.session.completed" && o.payment_status === "paid" || event.type === "checkout.session.completed" && o.mode === "subscription") {
      const accountId = o.metadata?.account_id ?? o.client_reference_id;
      const sku = o.metadata?.sku;
      if (accountId && sku && CATALOG[sku]) {
        if (sku === "pass") {
          // Expiry comes from the subscription; set a year now and let subscription events keep it exact.
          await grant(env, accountId, "pass", `stripe:${o.subscription}`, new Date(Date.now() + 366 * 86400000).toISOString());
        } else {
          await grant(env, accountId, sku, `stripe:${o.id}`);
        }
        await env.DB.prepare("INSERT INTO purchases (id, account_id, sku, stripe_ref, amount_cents, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(event.id, accountId, sku, o.subscription ?? o.id, o.amount_total ?? null, new Date().toISOString()).run();
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted" || event.type === "invoice.paid") {
      const sub = event.type === "invoice.paid" ? await stripe(env, `subscriptions/${o.subscription}`) : o;
      const accountId = sub.metadata?.account_id;
      if (accountId) {
        const active = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
        const until = active && !sub.cancel_at_period_end ? new Date(sub.current_period_end * 1000).toISOString()
          : active ? new Date(sub.current_period_end * 1000).toISOString() // cancelled at period end: keep until then
          : new Date().toISOString(); // ended: expire now; the Launch Collection rows stay
        await env.DB.prepare("UPDATE entitlements SET expires_at = ?, source = ? WHERE account_id = ? AND sku = 'pass'").bind(until, `stripe:${sub.id}`, accountId).run();
        await env.DB.prepare("INSERT OR IGNORE INTO purchases (id, account_id, sku, stripe_ref, amount_cents, created_at) VALUES (?, ?, 'pass', ?, NULL, ?)").bind(event.id, accountId, sub.id, new Date().toISOString()).run();
      }
    }
    return json({ ok: true });
  }
  return null;
}

/** Stripe-Signature: t=timestamp,v1=hex(hmac_sha256(secret, `${t}.${payload}`)). Five-minute tolerance. */
async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  if (!secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1 || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== v1.length) return false;
  let diff = 0; for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}
