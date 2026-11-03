// One place to change the brand once the name and domain are chosen.
export const SITE = {
  name: 'StoreSheet', // working name — replace when the domain is bought
  url: 'https://example.com', // replace with the real domain
  tagline: 'Free catalog, line sheet and export tools for Shopify and WooCommerce stores',
  supportEmail: 'hello@example.com',
  // Store-fetch API (Cloudflare Worker). Empty = URL import disabled, CSV import still works.
  apiBase: '',
};

export const TOOLS = [
  {
    slug: 'line-sheet-maker',
    name: 'Line Sheet Maker',
    blurb: 'Turn a store or a CSV into a printable wholesale line sheet.',
    live: true,
  },
  { slug: 'catalog-pdf', name: 'Product Catalog PDF', blurb: 'A PDF catalog with a cover page, photos and descriptions.', live: true },
  { slug: 'products-to-csv', name: 'Products to CSV / Excel', blurb: 'Export a product list to a clean spreadsheet.', live: true },
  { slug: 'review-exporter', name: 'Review Exporter', blurb: 'Export product reviews to CSV.', live: false },
  { slug: 'image-downloader', name: 'Product Image Downloader', blurb: 'Download all product images at once.', live: false },
];
