# Putting Vulgar Acts online

The whole game (web app, API, game rooms) runs as one Cloudflare Worker. Cloudflare's free plan covers it. Do steps 1 to 3 once; after step 6, every push to `main` deploys by itself.

## 1. Cloudflare account (5 min)

Sign up at dash.cloudflare.com (free). No card needed.

## 2. First deploy from your Mac (10 min)

In Terminal, in the project folder:

```
git pull
npm install
npx wrangler login
```

A browser tab opens; click **Allow**. Then:

```
npm run deploy
```

That builds the web app and uploads everything. The last lines print a URL like `https://vulgar-acts.<your-subdomain>.workers.dev`. Open it on your phone: that's the game, live on the internet. Share it with anyone.

If it asks "Would you like to enable the Durable Objects migration?" or similar, answer Yes.

## 3. Test it from outside your Wi-Fi

Turn Wi-Fi off on your phone and open the workers.dev URL over mobile data. Host a room, join from a second phone. If it works here, it works at a bar.

## 4. Your own address: vulgaracts.com (15 min) — done

1. In the Cloudflare dashboard click **Add a domain**, enter `vulgaracts.com`, choose the **Free** plan.
2. Cloudflare shows two nameservers (like `ada.ns.cloudflare.com`). At GoDaddy: My Products → Domains → DNS → Nameservers → Change → "I'll use my own nameservers", paste both, save. Cloudflare emails you when the domain is active.
3. `apps/server/wrangler.toml` routes the Worker to `vulgaracts.com` and `www.vulgaracts.com` (custom domains).
4. `npm run deploy`. Cloudflare creates the DNS records and certificates by itself; both addresses load the game within a few minutes. The workers.dev URL keeps working.

## 7. Accounts: database and sign-in email (15 min)

Accounts are email-only magic links. They need a D1 database and a way to send email.

1. **Database** — once: `cd apps/server && npx wrangler d1 create vulgar-acts`, paste the printed `database_id` into `wrangler.toml` under `[[d1_databases]]`. Then apply the schema (and again whenever a new file appears in `apps/server/migrations/`):
   ```
   npm run db:migrate --workspace apps/server
   ```
2. **Email** — sign up at resend.com (free tier). Domains → add `vulgaracts.com`, put the DNS records it gives you into Cloudflare → DNS, click Verify. API Keys → create one, then:
   ```
   cd apps/server && npx wrangler secret put RESEND_KEY
   ```
   Links are sent from `info@vulgaracts.com`; change `MAIL_FROM` under `[vars]` in `wrangler.toml` if you want another address.
3. `npm run deploy`. Test at vulgaracts.com/#account. Sign-in emails carry a six-digit code (typed into the page) and a link (works when the mail app opens it in the same browser). Without `RESEND_KEY` the page fills the code in itself (local dev only).

## 8. Granting decks by hand (founders, testers, you)

Until the store exists, decks are granted through an admin route protected by a secret:

```
cd apps/server && npx wrangler secret put ADMIN_KEY      # once; any long password
```

Then, from any terminal (replace KEY, the email and the sku):

```
curl -X POST https://vulgaracts.com/api/admin/grant \
  -H "x-admin-key: KEY" -H "content-type: application/json" \
  -d '{"email":"someone@example.com","sku":"launch"}'
```

SKUs: `starter_full`, `afterdark`, `office`, `pop`, `patent`, `launch` (the Launch Collection: all five, kept forever), `pass` (a year of everything; also grants the Launch Collection to keep). Add `"expiresAt":"2027-12-31T00:00:00Z"` to time-limit a grant. The email needn't have signed in yet; the account is created and the decks are waiting when they do.

See who has what: `curl -H "x-admin-key: KEY" https://vulgaracts.com/api/admin/accounts`

## 9. The store: Stripe (20 min)

1. stripe.com → create an account (business: Studio IO). Stay in **Test mode** (toggle top right) until you're ready to take real money.
2. **Developers → API keys** → copy the **Secret key** (`sk_test_…`), then:
   ```
   cd apps/server && npx wrangler secret put STRIPE_SECRET_KEY
   ```
3. **Developers → Webhooks → Add endpoint.** URL: `https://vulgaracts.com/api/stripe/webhook`. Events to send: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`. Save, then click **Reveal** under *Signing secret* (`whsec_…`) and:
   ```
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   ```
4. **Settings → Billing → Customer portal** → turn it on (lets Pass holders cancel themselves). Enable "Cancel subscriptions".
5. `npm run db:migrate` (new tables), then `npm run deploy`.
6. Test at vulgaracts.com/#store with card `4242 4242 4242 4242`, any future date, any CVC. The deck should appear on the account within seconds.
7. Going live: flip Stripe to **Live mode**, repeat steps 2–3 with the live keys (`sk_live_…`, a new live webhook) and redeploy. Complete the business/bank details in Stripe first.

Prices live in `apps/server/src/store.ts` (`CATALOG`). The founders deal (first 500 accounts get After Dark) is enforced server-side; `FOUNDERS_LIMIT` is in the same file.

## 5. Analytics (10 min, optional)

Sign up at posthog.com (free tier). Copy the **Project API key** (starts with `phc_`). In Terminal:

```
cd apps/server
npx wrangler secret put POSTHOG_KEY
```

Paste the key when asked. If PostHog gave you an EU host, also uncomment `[vars]` and `POSTHOG_HOST` in `wrangler.toml` and set it to `https://eu.i.posthog.com`. Redeploy. The server then records five events: room created, decks changed, game started, turn ended (with which cards got skipped), game finished (with every skipped card and its count). Nobody's name or custom card text is ever sent.

## 6. Deploy on every push (10 min, optional)

So Claude's pushes go live without you running anything:

1. Cloudflare dashboard → profile icon → **API Tokens** → **Create Token** → use the **Edit Cloudflare Workers** template → Continue → Create Token. Copy it.
2. Cloudflare dashboard → **Workers & Pages** → on the right, copy your **Account ID**.
3. GitHub → the VulgarActs repo → **Settings** → **Secrets and variables** → **Actions**:
   - **New repository secret** `CLOUDFLARE_API_TOKEN` = the token
   - **New repository secret** `CLOUDFLARE_ACCOUNT_ID` = the account id
   - **Variables** tab → **New repository variable** `DEPLOY_ENABLED` = `true`
4. The **Actions** tab shows each deploy; green check means it's live.

## Day to day

- `npm run dev` still runs everything locally for testing on your Wi-Fi.
- `npm run preview` runs the production build locally (one address, like the real thing).
- `npm run deploy` publishes by hand.
- Logs: `cd apps/server && npx wrangler tail` shows live server output while people play.
