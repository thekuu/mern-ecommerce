
-- Telegram scraping tables
CREATE TABLE public.telegram_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  last_message_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_sources TO anon;
GRANT ALL ON public.telegram_sources TO service_role;
ALTER TABLE public.telegram_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage telegram sources"
  ON public.telegram_sources FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.telegram_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,
  message_id INTEGER NOT NULL,
  post_url TEXT,
  raw_caption TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  parsed JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | imported | dismissed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel, message_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_drafts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_drafts TO anon;
GRANT ALL ON public.telegram_drafts TO service_role;
ALTER TABLE public.telegram_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage telegram drafts"
  ON public.telegram_drafts FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX telegram_drafts_status_idx ON public.telegram_drafts(status, created_at DESC);

-- Seed the first channel
INSERT INTO public.telegram_sources (username) VALUES ('crownshoes1');
