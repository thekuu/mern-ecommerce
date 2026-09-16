// Scrapes public Telegram channel previews via https://t.me/s/<channel>,
// parses new posts, uses Lovable AI to extract structured product data,
// and stores them as pending drafts for admin review.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ParsedPost {
  messageId: number;
  postUrl: string;
  caption: string;
  images: string[];
}

// Parse the t.me/s/<channel> HTML. This page is intentionally public,
// server-rendered, and safe to fetch without any auth.
function parsePosts(html: string, channel: string): ParsedPost[] {
  const posts: ParsedPost[] = [];
  // Each post block: <div class="tgme_widget_message ..." data-post="channel/123" ...>
  const blockRegex = /<div class="tgme_widget_message[^"]*"[^>]*data-post="([^"]+)"[\s\S]*?(?=<div class="tgme_widget_message[^"]*"[^>]*data-post=|<\/section>)/g;
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(html))) {
    const [block, dataPost] = [m[0], m[1]];
    const parts = dataPost.split('/');
    const messageId = Number(parts[1]);
    if (!Number.isFinite(messageId)) continue;

    // Caption
    const captionMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    let caption = '';
    if (captionMatch) {
      caption = captionMatch[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<a[^>]*>|<\/a>|<i>|<\/i>|<b>|<\/b>|<span[^>]*>|<\/span>|<tg-emoji[^>]*>|<\/tg-emoji>|<code>|<\/code>/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .trim();
    }

    // Photos: <a class="tgme_widget_message_photo_wrap" style="background-image:url('URL')" ...>
    const images: string[] = [];
    const photoRegex = /tgme_widget_message_photo_wrap[^>]*background-image:url\(['"]?([^'")]+)['"]?\)/g;
    let pm: RegExpExecArray | null;
    while ((pm = photoRegex.exec(block))) images.push(pm[1]);

    if (images.length === 0 && !caption) continue;

    posts.push({
      messageId,
      postUrl: `https://t.me/${channel}/${messageId}`,
      caption,
      images,
    });
  }
  return posts;
}

// Collapse runaway repetition like "Original ✔️ Original ✔️ Original ✔️ ..."
// that models occasionally emit on short/emoji-heavy captions.
function sanitizeText(input: string, maxLen = 600): string {
  if (!input) return '';
  let s = input;
  // Collapse a short phrase (2-40 chars) that immediately repeats 3+ times
  s = s.replace(/(.{2,40}?)(?:\s*\1){2,}/g, '$1');
  // Collapse repeated whitespace
  s = s.replace(/\s{2,}/g, ' ').trim();
  if (s.length > maxLen) s = s.slice(0, maxLen).trim() + '…';
  return s;
}

function sanitizeParsed(parsed: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!parsed) return null;
  const out: Record<string, unknown> = { ...parsed };
  if (typeof out.name === 'string') out.name = sanitizeText(out.name, 120);
  if (typeof out.description === 'string') out.description = sanitizeText(out.description, 600);
  // Dedupe arrays
  for (const k of ['sizes', 'colors']) {
    const v = out[k];
    if (Array.isArray(v)) out[k] = Array.from(new Set(v.map((x) => String(x).trim()).filter(Boolean)));
  }
  return out;
}

async function parseCaptionWithAI(caption: string, apiKey: string): Promise<Record<string, unknown> | null> {
  if (!caption.trim()) return null;
  // Pre-sanitize caption to avoid feeding the model 1000 copies of the same phrase
  const cleanCaption = sanitizeText(caption, 1500);
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Lovable-API-Key': apiKey,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'Extract structured product info from a Telegram shop caption written in English or Amharic. ' +
            'Return ONLY minified JSON matching this schema: ' +
            '{"name":string,"price":number|null,"currency":string|null,"sizes":string[],"colors":string[],"category":string|null,"description":string}. ' +
            'Rules: description must be at most 2 short sentences and MUST NOT repeat the same phrase. ' +
            'Prices in ETB/Birr default to currency "ETB". ' +
            'SIZE RULES: ' +
            '- For SHOES/footwear/sneakers: keep the original numeric sizes as strings (e.g. "40","41","42"). ' +
            '- For CLOTHING (shirts, t-shirts, hoodies, jackets, dresses, pants, trousers, jeans, suits, tracksuits, sweaters, tops, bottoms, kids/adult apparel): ALWAYS output LETTER sizes only from this set: ["XS","S","M","L","XL","XXL","XXXL"]. ' +
            '  * If caption lists letter sizes, use them as-is. ' +
            '  * If caption lists numeric sizes or ranges, MAP each to its letter equivalent using standard adult sizing (e.g. 44/46=XS, 46/48=S, 48/50=M, 50/52=L, 52/54=XL, 54/56=XXL). ' +
            '  * If caption says "all sizes available" or lists nothing specific, output the full range ["S","M","L","XL","XXL"]. ' +
            '- If category is unknown but the item is clearly wearable clothing, apply the clothing letter-size rule. ' +
            'Do not invent info; use nulls or empty arrays when truly unknown.',
        },
        { role: 'user', content: cleanCaption },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    console.error('AI gateway error', res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) return null;
  try {
    return sanitizeParsed(JSON.parse(text));
  } catch {
    return null;
  }

}

// Download image from Telegram CDN and upload to our storage bucket so URLs
// don't expire when Telegram rotates them. Returns a long-lived signed URL.
async function persistImage(
  supabase: ReturnType<typeof createClient>,
  sourceUrl: string,
  channel: string,
  messageId: number,
  index: number,
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) {
      console.error('image fetch failed', res.status, sourceUrl);
      return null;
    }
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const bytes = new Uint8Array(await res.arrayBuffer());
    const path = `${channel}/${messageId}/${index}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('telegram-images')
      .upload(path, bytes, { contentType, upsert: true });
    if (upErr) {
      console.error('upload error', upErr);
      return null;
    }
    // 10-year signed URL (bucket is private, RLS allows public read but signed URL is simplest here)
    const { data: signed } = await supabase.storage
      .from('telegram-images')
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    return signed?.signedUrl ?? null;
  } catch (err) {
    console.error('persistImage error', err);
    return null;
  }
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) throw new Error('LOVABLE_API_KEY not configured');

    const body = await req.json().catch(() => ({}));
    let channels: string[] = [];
    if (body.channel) {
      channels = [String(body.channel).replace(/^@/, '').trim()];
    } else {
      const { data: sources } = await supabase
        .from('telegram_sources')
        .select('username')
        .eq('active', true);
      channels = (sources ?? []).map((s) => s.username);
    }

    const summary: Record<string, unknown>[] = [];

    for (const channel of channels) {
      const url = `https://t.me/s/${channel}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HomiCartBot/1.0)' } });
      if (!res.ok) {
        summary.push({ channel, error: `Fetch failed ${res.status}` });
        continue;
      }
      const html = await res.text();
      const posts = parsePosts(html, channel);

      // Filter out already-imported posts
      const ids = posts.map((p) => p.messageId);
      const { data: existing } = await supabase
        .from('telegram_drafts')
        .select('message_id')
        .eq('channel', channel)
        .in('message_id', ids.length ? ids : [-1]);
      const existingIds = new Set((existing ?? []).map((r) => r.message_id));
      const fresh = posts.filter((p) => !existingIds.has(p.messageId));

      let inserted = 0;
      let maxMsg = 0;
      for (const post of fresh) {
        const parsed = await parseCaptionWithAI(post.caption, lovableKey);
        // Persist images so URLs don't expire when Telegram rotates CDN links
        const persisted: string[] = [];
        for (let i = 0; i < post.images.length; i++) {
          const url = await persistImage(supabase, post.images[i], channel, post.messageId, i);
          persisted.push(url ?? post.images[i]);
        }
        const { error } = await supabase.from('telegram_drafts').insert({
          channel,
          message_id: post.messageId,
          post_url: post.postUrl,
          raw_caption: post.caption,
          images: persisted,
          parsed,
          status: 'pending',
        });
        if (!error) inserted++;
        if (post.messageId > maxMsg) maxMsg = post.messageId;
      }


      await supabase
        .from('telegram_sources')
        .update({
          last_scraped_at: new Date().toISOString(),
          last_message_id: maxMsg || undefined,
        })
        .eq('username', channel);

      summary.push({ channel, found: posts.length, imported: inserted });
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('telegram-scrape error', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
