-- Accounts are an email and nothing else. Sessions and magic links store only hashes of their tokens.
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);
CREATE TABLE IF NOT EXISTS magic_links (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS magic_links_email ON magic_links(email, created_at);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_account ON sessions(account_id);
-- What each account owns. Filled by the store (next beats); read by the game.
CREATE TABLE IF NOT EXISTS entitlements (
  account_id TEXT NOT NULL REFERENCES accounts(id),
  sku TEXT NOT NULL,
  source TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  expires_at TEXT,
  PRIMARY KEY (account_id, sku)
);
