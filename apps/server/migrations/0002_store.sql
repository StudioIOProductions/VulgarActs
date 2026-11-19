-- Store: Stripe customer per account, a purchase log (also dedupes webhook retries), founders claims live in entitlements.source.
ALTER TABLE accounts ADD COLUMN stripe_customer TEXT;
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,            -- Stripe event id, so a retried webhook is a no-op
  account_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  stripe_ref TEXT,                -- checkout session / subscription id
  amount_cents INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS purchases_account ON purchases(account_id);
