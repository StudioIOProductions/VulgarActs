-- Magic links also carry a six-digit code that can be typed into the browser that asked for it.
ALTER TABLE magic_links ADD COLUMN code_hash TEXT;
ALTER TABLE magic_links ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
