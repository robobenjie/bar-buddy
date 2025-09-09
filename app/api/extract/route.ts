// app/api/extract/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";
import { init } from '@instantdb/admin';

export const runtime = "nodejs";

// Initialize InstantDB admin client for server-side operations
const db = init({ 
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
  adminToken: process.env.INSTANT_ADMIN_TOKEN! 
});

// Generate normalized cache key from URL
function getNormalizedUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove tracking params and normalize
    urlObj.search = '';
    urlObj.hash = '';
    // Ensure consistent reddit.com format
    if (urlObj.hostname.includes('reddit.com')) {
      urlObj.hostname = 'www.reddit.com';
    }
    return urlObj.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

type ExtractOut = {
  title?: string;
  description?: string;
  ingredients: string[];
  normalized?: { name: string; quantity?: string; unit?: string; notes?: string }[];
  image_url?: string;
  from?: "post" | "op_comment";
  source?: { url: string };
};

export async function POST(req: NextRequest) {
  try {
    console.log('[Reddit Extract] Starting extraction...');
    
    // Log request details for debugging mobile issues
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    console.log('[Reddit Extract] Request info:', {
      userAgent: userAgent.substring(0, 100) + '...', // Truncate for logs
      clientIP,
      isMobile: /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    });
    
    // Check environment variables
    console.log('[Reddit Extract] Environment check:', {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      openAIKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      userAgent: process.env.REDDIT_USER_AGENT || 'bar-buddy/1.0 (extractor)'
    });
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    const { url } = await req.json();
    console.log('[Reddit Extract] Input URL:', url);
    
    if (!url || typeof url !== "string") {
      return json({ error: "Body must include { url: string }" }, 400);
    }

    const resolved = await resolveFinalUrl(url);
    const normalizedUrl = getNormalizedUrl(resolved);
    
    console.log('[Reddit Extract] URL resolution:', {
      original: url,
      resolved: resolved,
      normalized: normalizedUrl
    });
    
    // Check cache first
    try {
      const cached = await db.query({ redditCache: { $: { where: { url: normalizedUrl } } } });
      if (cached.redditCache?.[0]) {
        const cachedData = cached.redditCache[0];
        console.log('[Reddit Extract] Cache HIT for:', normalizedUrl);
        
        const cachedResult: ExtractOut = {
          title: cachedData.title || undefined,
          description: cachedData.description || undefined,
          ingredients: Array.isArray(cachedData.ingredients) ? cachedData.ingredients : [],
          normalized: Array.isArray(cachedData.normalized) ? cachedData.normalized : undefined,
          image_url: cachedData.imageUrl || undefined,
          from: cachedData.extractedFrom as ExtractOut['from'] || 'post',
          source: { url: resolved }
        };
        
        return json(cachedResult, 200);
      }
    } catch (cacheError) {
      console.log('[Reddit Extract] Cache check failed:', cacheError);
      // Continue with normal processing if cache fails
    }
    
    console.log('[Reddit Extract] Cache MISS for:', normalizedUrl);
    
    // Get Reddit OAuth access token
    let accessToken: string;
    try {
      accessToken = await getRedditAccessToken();
      console.log('[Reddit Extract] Got Reddit OAuth token');
    } catch (error) {
      console.error('[Reddit Extract] Failed to get Reddit OAuth token:', error);
      return json({ error: `Reddit OAuth failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, 502);
    }
    
    const apiUrl = toRedditOAuthUrl(resolved);
    console.log('[Reddit Extract] Using OAuth URL:', apiUrl);

    const r = await fetch(apiUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "User-Agent": process.env.REDDIT_USER_AGENT || "bar-buddy/1.0 (extractor)",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9"
      },
      redirect: "follow",
      cache: "no-store"
    });
    
    if (!r.ok) {
      console.log('[Reddit Extract] Reddit API error:', {
        status: r.status,
        statusText: r.statusText,
        headers: Object.fromEntries(r.headers.entries())
      });
      return json({ error: `Reddit fetch failed: ${r.status} ${r.statusText}` }, 502);
    }

    const payload = await r.json();

    const post = getPost(payload);
    if (!post) return json({ error: "Could not parse Reddit post payload." }, 422);

    const { title, selftext, author, images } = post;
    const imageUrl = pickFirstImage(images, post.url_overridden_by_dest);

    // Try to locate recipe text: prefer post body, else OP's top-level comment.
    let recipeText = coalesceText(title, selftext);
    let from: ExtractOut["from"] = "post";
    if (!looksLikeRecipe(recipeText)) {
      const opComment = findOpTopLevelComment(payload, author);
      if (opComment) {
        recipeText = coalesceText(title, opComment.body || "");
        from = "op_comment";
      }
    }

    // Fall back: if everything is empty, return minimal
    if (!recipeText?.trim()) {
      return json(
        { 
          title: title || undefined,
          ingredients: [], 
          image_url: imageUrl, 
          from, 
          source: { url: resolved } 
        } as ExtractOut,
        200
      );
    }

    console.log('[Reddit Extract] Recipe text length:', recipeText.length);
    console.log('[Reddit Extract] Recipe text preview:', recipeText.slice(0, 200));
    
    // --- OpenAI using the responses API ---
    const promptText = `From the following text (title + body/comment), extract ingredients. Return:
{
  "title": string,
  "description": string,
  "ingredients": string[],
  "normalized": {"name": string, "quantity"?: string, "unit"?: string, "notes"?: string}[]
}
If nothing looks like ingredients, return an empty array. For the description go for short and enegmatic. Example: "refreshing with a bit of intrigue" or "smokey, salty". If you aren't sure, leave it blank.
Title should be "Title Case", and ingredients should have the first letter capitalized.

${recipeText.slice(0, 30_000)}`;
    
    console.log('[Reddit Extract] Making OpenAI request...');
    
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      input: promptText,
    });
    
    console.log('[Reddit Extract] OpenAI response:', JSON.stringify(response, null, 2));
    
    const text = response.output_text || "{}";
    console.log('[Reddit Extract] Extracted text:', text);

    let parsed: Partial<ExtractOut> = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { ingredients: [] };
    }

    const out: ExtractOut = {
      title: parsed.title && typeof parsed.title === 'string' ? parsed.title.trim() : undefined,
      description: parsed.description && typeof parsed.description === 'string' ? parsed.description.trim() : undefined,
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      normalized: Array.isArray(parsed.normalized) ? parsed.normalized : undefined,
      image_url: imageUrl || undefined,
      from,
      source: { url: resolved }
    };

    // Store result in cache
    try {
      await db.transact([
        db.tx.redditCache[crypto.randomUUID()].update({
          url: normalizedUrl,
          title: out.title || null,
          description: out.description || null,
          ingredients: out.ingredients,
          normalized: out.normalized || null,
          imageUrl: out.image_url || null,
          source: resolved,
          extractedFrom: out.from || null,
          createdAt: Date.now()
        })
      ]);
      console.log('[Reddit Extract] Cached result for:', normalizedUrl);
    } catch (cacheError) {
      console.log('[Reddit Extract] Failed to cache result:', cacheError);
      // Don't fail the request if caching fails
    }

    console.log('[Reddit Extract] Final output:', JSON.stringify(out, null, 2));
    return json(out, 200);
  } catch (e: any) {
    console.log('[Reddit Extract] Error:', e);
    return json({ error: e?.message || "Unknown error" }, 500);
  }
}

/* ---------- Reddit helpers ---------- */

// Follow short / mobile links
async function resolveFinalUrl(u: string): Promise<string> {
  try {
    // For mobile share URLs (/s/), we need to follow redirects to get the full URL
    console.log('[URL Resolver] Resolving URL:', u);
    
    const res = await fetch(u, { 
      method: "HEAD", 
      redirect: "follow",
      headers: {
        'User-Agent': process.env.REDDIT_USER_AGENT || 'bar-buddy/1.0 (contact:bmholson@gmail.com)'
      }
    });
    
    const finalUrl = res.url || u;
    console.log('[URL Resolver] Final URL:', finalUrl);
    
    return finalUrl;
  } catch (error) {
    console.log('[URL Resolver] Error resolving URL:', error);
    return u;
  }
}

// Get Reddit OAuth access token for application-only authentication
async function getRedditAccessToken(): Promise<string> {
  const auth = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'User-Agent': process.env.REDDIT_USER_AGENT || 'bar-buddy/1.0 (contact:bmholson@gmail.com)',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Reddit OAuth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Convert a permalink to Reddit OAuth API URL
function toRedditOAuthUrl(u: string): string {
  const url = new URL(u);
  // Use oauth.reddit.com for authenticated requests
  url.hostname = "oauth.reddit.com";
  if (!url.pathname.endsWith(".json")) {
    url.pathname = url.pathname.replace(/\/+$/, "") + "/.json";
  }
  url.searchParams.set("raw_json", "1"); // unescape URLs/text
  return url.toString();
}

// Post object from payload[0]
function getPost(payload: any) {
  const listing = Array.isArray(payload) ? payload[0] : payload;
  const data = listing?.data?.children?.[0]?.data;
  if (!data) return null;

  const images: string[] = [];

  // preview images
  const preview = data.preview?.images ?? [];
  for (const p of preview) {
    const src = p?.source?.url && p.source.url.replace(/&amp;/g, "&");
    if (src) images.push(src);
  }

  // gallery
  if (data.is_gallery && data.media_metadata) {
    for (const k of Object.keys(data.media_metadata)) {
      const m = data.media_metadata[k];
      const best = (m?.p || []).at(-1)?.u || m?.s?.u || m?.s?.gif;
      if (best) images.push(String(best).replace(/&amp;/g, "&"));
    }
  }

  return {
    title: data.title || "",
    selftext: data.selftext || "",
    author: data.author || "",
    url_overridden_by_dest: data.url_overridden_by_dest || "",
    images: dedupe(images)
  };
}

// First reasonable image for "single image" style posts
function pickFirstImage(images: string[], overridden?: string): string | undefined {
  const direct =
    overridden && /\.(png|jpe?g|webp)$/i.test(overridden) ? overridden : undefined;
  return (direct || images?.[0] || "").replace(/^http:/, "https:");
}

function findOpTopLevelComment(payload: any, op: string) {
  // payload[1] is comments listing
  const commentsListing = Array.isArray(payload) ? payload[1] : null;
  const children = commentsListing?.data?.children || [];
  for (const c of children) {
    if (c.kind !== "t1") continue; // comment
    const d = c.data;
    if (!d) continue;
    if (d.author === op) return d;
  }
  return null;
}

/* ---------- heuristics/util ---------- */

function looksLikeRecipe(text?: string) {
  if (!text) return false;
  const lines = text.split(/\r?\n/);
  let hits = 0;
  for (const ln of lines) {
    if (/[0-9]+\/?[0-9]*\s?(cup|oz|ounce|ounces|ml|tsp|tbsp|dash|part|parts|cl|g|grams|slice|slices)/i.test(ln))
      hits++;
    if (/^\s*[-*•]/.test(ln)) hits++;
  }
  return hits >= 2;
}

function coalesceText(title: string, body: string) {
  return `${title}\n\n${body}`.trim();
}

function dedupe<T>(xs: T[]) {
  return Array.from(new Set(xs));
}

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

async function safeText(r: Response) {
  try {
    return await r.text();
  } catch {
    return "";
  }
}
