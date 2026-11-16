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

## 4b. Playtest feedback (2 min)

Players fill in `vulgaracts.com/#feedback` (linked from the final scoreboard). To read the answers, set a secret once:

```
cd apps/server && npx wrangler secret put FEEDBACK_KEY
```

Type any password you like. Then open `https://vulgaracts.com/api/feedback?key=THATPASSWORD` to download every form as a CSV (opens in Numbers/Excel/Google Sheets).

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
