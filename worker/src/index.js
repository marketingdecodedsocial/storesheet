// Store-fetch API — Cloudflare Worker.
// GET /products?url=<store address>  →  { store, platform, products: [...] }
// Reads only PUBLIC storefront data: Shopify /products.json, WooCommerce Store API.

const MAX_PRODUCTS = 250;
const TIMEOUT_MS = 8000;

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      Vary: 'Origin',
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.pathname !== '/products') return json({ error: 'Not found' }, 404);

    let store;
    try {
      store = normalizeStore(url.searchParams.get('url') || '');
    } catch (e) {
      return json({ error: e.message }, 400);
    }

    // Cache per store for 10 minutes to stay polite to stores and fast for users.
    const cache = caches.default;
    const cacheKey = new Request(`https://cache.local/products/${store.host}`);
    const hit = await cache.match(cacheKey);
    if (hit) {
      const body = await hit.json();
      return json(body);
    }

    let result = await tryShopify(store).catch(() => null);
    if (!result) result = await tryWoo(store).catch(() => null);
    if (!result || !result.products.length) {
      return json(
        {
          error:
            "Couldn't read products from that store. It may not be Shopify or WooCommerce, or its product data isn't public. Upload a CSV export instead.",
        },
        422,
      );
    }

    const body = { store: store.host, ...result };
    await cache.put(cacheKey, new Response(JSON.stringify(body), { headers: { 'Cache-Control': 'max-age=600' } }));
    return json(body);
  },
};

// Accept "mystore.com", "https://mystore.com/collections/x" etc. Reject anything that isn't a public hostname.
export function normalizeStore(input) {
  const raw = input.trim();
  if (!raw) throw new Error('Enter a store address.');
  let u;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("That doesn't look like a web address.");
  }
  const host = u.hostname.toLowerCase();
  const blocked =
    !host.includes('.') ||
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) || // raw IPv4
    host.includes(':'); // raw IPv6
  if (blocked) throw new Error('Enter a public store address, like yourstore.com.');
  return { host, base: `https://${host}` };
}

async function get(urlStr) {
  const res = await fetch(urlStr, {
    headers: { Accept: 'application/json', 'User-Agent': 'StoreSheetBot/1.0 (+product line sheet tool)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('Content-Type') || '';
  if (!type.includes('json')) throw new Error('Not JSON');
  return res.json();
}

async function tryShopify({ base }) {
  const products = [];
  for (let page = 1; products.length < MAX_PRODUCTS && page <= 2; page++) {
    const data = await get(`${base}/products.json?limit=250&page=${page}`);
    if (!Array.isArray(data.products)) throw new Error('Not Shopify');
    for (const p of data.products) products.push(fromShopify(p, base));
    if (data.products.length < 250) break;
  }
  return { platform: 'shopify', products: products.slice(0, MAX_PRODUCTS) };
}

export function fromShopify(p, base) {
  const variants = Array.isArray(p.variants) ? p.variants : [];
  const prices = variants.map((v) => parseFloat(v.price)).filter((n) => Number.isFinite(n));
  return {
    title: String(p.title || ''),
    sku: String(variants[0]?.sku || ''),
    price: prices.length ? Math.min(...prices) : null,
    image: String(p.images?.[0]?.src || ''),
    vendor: String(p.vendor || ''),
    type: String(p.product_type || ''),
    url: p.handle ? `${base}/products/${p.handle}` : '',
    description: toText(String(p.body_html || '')),
  };
}

async function tryWoo({ base }) {
  const products = [];
  for (let page = 1; products.length < MAX_PRODUCTS && page <= 3; page++) {
    const data = await get(`${base}/wp-json/wc/store/v1/products?per_page=100&page=${page}`);
    if (!Array.isArray(data)) throw new Error('Not WooCommerce');
    for (const p of data) products.push(fromWoo(p));
    if (data.length < 100) break;
  }
  return { platform: 'woocommerce', products: products.slice(0, MAX_PRODUCTS) };
}

export function fromWoo(p) {
  // Store API prices are integers in minor units (e.g. 3200 = $32.00).
  const minor = Number(p.prices?.currency_minor_unit ?? 2);
  const raw = p.prices?.regular_price || p.prices?.price;
  const price = raw !== undefined && raw !== '' ? Number(raw) / 10 ** minor : null;
  return {
    title: decode(String(p.name || '')),
    sku: String(p.sku || ''),
    price: Number.isFinite(price) ? price : null,
    image: String(p.images?.[0]?.src || ''),
    vendor: '',
    type: decode(String(p.categories?.[0]?.name || '')),
    url: String(p.permalink || ''),
    description: toText(String(p.short_description || p.description || '')),
  };
}

// Product descriptions arrive as HTML; tools need plain text.
function toText(html) {
  return decode(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
    .slice(0, 2000);
}

// WooCommerce returns names with HTML entities (e.g. &#8211;).
function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
