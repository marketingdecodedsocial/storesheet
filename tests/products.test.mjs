// Run with: node --test --experimental-strip-types tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, productsFromCSV, wholesale, toCSV } from '../src/scripts/products.ts';
import { normalizeStore, fromShopify, fromWoo } from '../worker/src/index.js';

test('parseCSV handles quotes, commas and newlines', () => {
  const rows = parseCSV('a,b\r\n"x, y","line1\nline2"\n"he said ""hi""",2\n');
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'line1\nline2'], ['he said "hi"', '2']]);
});

test('Shopify export: groups variant rows by Handle, keeps first image and lowest price', () => {
  const csv = [
    'Handle,Title,Variant SKU,Variant Price,Image Src,Vendor,Type',
    'mug,Stoneware Mug,MUG-1,32.00,https://cdn.example/mug.jpg,Brand,Drinkware',
    'mug,,MUG-2,28.00,,,',
    'bowl,Serving Bowl,BWL-1,58,https://cdn.example/bowl.jpg,Brand,Serveware',
  ].join('\n');
  const p = productsFromCSV(parseCSV(csv));
  assert.equal(p.length, 2);
  assert.equal(p[0].title, 'Stoneware Mug');
  assert.equal(p[0].price, 28);
  assert.equal(p[0].sku, 'MUG-1');
  assert.equal(p[0].image, 'https://cdn.example/mug.jpg');
});

test('WooCommerce export: Name, Regular price, comma-separated Images, nested Categories', () => {
  const csv = 'Name,SKU,Regular price,Images,Categories\n"Vase",V-1,44,"https://a/1.jpg, https://a/2.jpg","Decor > Vases"\n';
  const [p] = productsFromCSV(parseCSV(csv));
  assert.equal(p.image, 'https://a/1.jpg');
  assert.equal(p.type, 'Vases');
  assert.equal(p.price, 44);
});

test('missing name column gives a clear error', () => {
  assert.throws(() => productsFromCSV(parseCSV('sku,price\nA,1\n')), /Title/);
});

test('wholesale and CSV export', () => {
  assert.equal(wholesale(32, 50), 16);
  assert.equal(wholesale(null, 50), null);
  const out = toCSV([{ title: 'Mug, large', sku: 'M', price: 30, image: '', vendor: '', type: '', url: '' }], 50);
  assert.match(out, /"Mug, large",M,15\.00,30\.00/);
});

test('normalizeStore accepts store addresses and blocks private hosts', () => {
  assert.equal(normalizeStore('mystore.com').base, 'https://mystore.com');
  assert.equal(normalizeStore('https://Shop.Example.com/collections/all').host, 'shop.example.com');
  for (const bad of ['localhost', '127.0.0.1', 'http://10.0.0.1', 'intranet', 'printer.local', '']) {
    assert.throws(() => normalizeStore(bad));
  }
});

test('fromShopify and fromWoo normalize prices and images', () => {
  const s = fromShopify(
    { title: 'Mug', handle: 'mug', vendor: 'B', product_type: 'Cups', variants: [{ sku: 'M1', price: '30.00' }, { sku: 'M2', price: '25.00' }], images: [{ src: 'https://cdn/x.jpg' }] },
    'https://shop.com',
  );
  assert.equal(s.price, 25);
  assert.equal(s.url, 'https://shop.com/products/mug');
  const w = fromWoo({ name: 'Tea &amp; Cup &#8211; Blue', sku: 'T1', prices: { regular_price: '3200', currency_minor_unit: 2 }, images: [{ src: 'https://w/x.jpg' }], categories: [{ name: 'Cups' }], permalink: 'https://w/p' });
  assert.equal(w.price, 32);
  assert.equal(w.title, 'Tea & Cup – Blue');
});

import { stripHtml, tableToCSV, exportRows } from '../src/scripts/products.ts';
import { buildXlsx } from '../src/scripts/xlsx.ts';
import { writeFileSync } from 'node:fs';

test('stripHtml turns description HTML into readable text', () => {
  assert.equal(stripHtml('<p>Hand made &amp; glazed.</p><ul><li>12 oz</li><li>Dishwasher safe</li></ul><script>x()</script>'), 'Hand made & glazed.\n12 oz\nDishwasher safe');
});

test('Shopify CSV descriptions come through as text', () => {
  const [p] = productsFromCSV(parseCSV('Handle,Title,Body (HTML)\nmug,Mug,"<p>Big <b>mug</b></p>"\n'));
  assert.equal(p.description, 'Big mug');
});

test('tableToCSV blocks spreadsheet formula injection and quotes safely', () => {
  const out = tableToCSV(['A', 'B'], [['=HYPERLINK("x")', 'a,b'], [5, '+1']]);
  assert.equal(out, 'A,B\r\n"\'=HYPERLINK(""x"")","a,b"\r\n5,\'+1');
});

test('exportRows drops inline sample images', () => {
  const [row] = exportRows([{ title: 'T', sku: 'S', price: 9.5, image: 'data:image/svg+xml,x', vendor: 'V', type: 'C', url: 'u', description: 'd' }]);
  assert.deepEqual(row, ['T', 'S', 9.5, 'V', 'C', 'd', '', 'u']);
});

test('buildXlsx writes a zip with the workbook parts', () => {
  const bytes = buildXlsx(['Title', 'Price'], [['Mug & <Cup>', 32], ['Bowl', '']]);
  assert.equal(String.fromCharCode(bytes[0], bytes[1]), 'PK');
  writeFileSync(process.env.XLSX_OUT || '/dev/null', bytes);
});

test('worker descriptions are plain text', () => {
  const s = fromShopify({ title: 'Mug', body_html: '<p>Hello&nbsp;<em>there</em></p>', variants: [], images: [] }, 'https://s.com');
  assert.equal(s.description, 'Hello there');
});
