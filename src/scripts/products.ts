// Pure helpers shared by the tools: CSV parsing and product normalizing.
// No DOM access here, so these run in tests too.

export interface Product {
  title: string;
  sku: string;
  price: number | null; // retail price (MSRP)
  image: string;
  vendor: string;
  type: string;
  url: string;
  description?: string; // plain text
}

/** HTML product descriptions → plain text (no DOM needed). */
export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

/** RFC-4180-style CSV parser: quoted fields, escaped quotes, CRLF, newlines inside quotes. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** Find a column by any of several header names (case-insensitive). */
function col(headers: string[], ...names: string[]): number {
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const n of names) {
    const i = lower.indexOf(n.toLowerCase());
    if (i !== -1) return i;
  }
  return -1;
}

/**
 * Turn CSV rows into products. Understands Shopify's product export
 * (several rows per Handle) and simple sheets with name/sku/price/image columns.
 */
export function productsFromCSV(rows: string[][]): Product[] {
  if (rows.length < 2) return [];
  const [headers, ...data] = rows;
  const iHandle = col(headers, 'Handle');
  const iTitle = col(headers, 'Title', 'Name', 'Product Name', 'Product', 'Item');
  const iSku = col(headers, 'Variant SKU', 'SKU', 'Item Number', 'Style', 'Style Number');
  const iPrice = col(headers, 'Variant Price', 'Regular price', 'Price', 'MSRP', 'Retail Price', 'Retail');
  const iImage = col(headers, 'Image Src', 'Images', 'Image', 'Image URL', 'Photo');
  const iVendor = col(headers, 'Vendor', 'Brand');
  const iType = col(headers, 'Type', 'Product Type', 'Categories', 'Category');
  const iUrl = col(headers, 'URL', 'Link', 'Product URL', 'Permalink');
  const iDesc = col(headers, 'Body (HTML)', 'Short description', 'Description', 'Body');

  if (iTitle === -1 && iHandle === -1) {
    throw new Error('Could not find a product name column. Add a column called "Title" or "Name".');
  }

  const get = (r: string[], i: number) => (i >= 0 && r[i] !== undefined ? r[i].trim() : '');
  const byKey = new Map<string, Product>();
  const order: string[] = [];

  data.forEach((r, idx) => {
    const key = iHandle >= 0 && get(r, iHandle) ? get(r, iHandle) : `row-${idx}`;
    const existing = byKey.get(key);
    // WooCommerce exports list several images comma-separated; take the first.
    const image = get(r, iImage).split(',')[0].trim();
    const price = toNumber(get(r, iPrice));
    if (!existing) {
      const title = get(r, iTitle);
      if (!title && iHandle === -1) return;
      byKey.set(key, {
        title: title || key,
        sku: get(r, iSku),
        price,
        image,
        vendor: get(r, iVendor),
        type: get(r, iType).split('>').pop()!.split(',')[0].trim(),
        url: get(r, iUrl),
        description: stripHtml(get(r, iDesc)),
      });
      order.push(key);
    } else {
      // Later rows of the same Shopify product: fill gaps, keep the lowest price.
      if (!existing.image && image) existing.image = image;
      if (!existing.sku && get(r, iSku)) existing.sku = get(r, iSku);
      if (price !== null && (existing.price === null || price < existing.price)) existing.price = price;
      if (!existing.title && get(r, iTitle)) existing.title = get(r, iTitle);
    }
  });
  return order.map((k) => byKey.get(k)!).filter((p) => p.title);
}

/** Wholesale price from retail, rounded to cents. */
export function wholesale(price: number | null, percentOfRetail: number): number | null {
  if (price === null) return null;
  return Math.round(price * (percentOfRetail / 100) * 100) / 100;
}

export function formatMoney(n: number | null, currency = 'USD'): string {
  if (n === null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
}

/** Column set for full product exports (CSV and Excel). */
export const EXPORT_COLUMNS = ['Title', 'SKU', 'Price', 'Vendor', 'Category', 'Description', 'Image URL', 'Product URL'] as const;

export function exportRows(products: Product[]): (string | number)[][] {
  return products.map((p) => [
    p.title,
    p.sku,
    p.price === null ? '' : p.price,
    p.vendor,
    p.type,
    p.description || '',
    p.image.startsWith('data:') ? '' : p.image,
    p.url,
  ]);
}

/** Any table as CSV text. Guards against spreadsheet formula injection. */
export function tableToCSV(header: readonly string[], rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    let s = String(v);
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

/** Line sheet as CSV text (for download). */
export function toCSV(products: Product[], percent: number, currency = 'USD'): string {
  const header = ['Title', 'SKU', `Wholesale (${currency})`, `MSRP (${currency})`, 'Category', 'Image'];
  const rows = products.map((p) => {
    const w = wholesale(p.price, percent);
    return [p.title, p.sku, w === null ? '' : w.toFixed(2), p.price === null ? '' : p.price.toFixed(2), p.type, p.image.startsWith('data:') ? '' : p.image];
  });
  return tableToCSV(header, rows);
}
