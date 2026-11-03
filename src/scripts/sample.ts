import type { Product } from './products';

// Simple drawn placeholders so the sample works offline with no third-party images.
const svg = (bg: string, fg: string, shape: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${bg}"/>${shape.replace(/FG/g, fg)}</svg>`,
  )}`;

const mug = '<rect x="60" y="62" width="70" height="84" rx="10" fill="FG"/><path d="M130 82h12a14 14 0 0 1 0 28h-12" fill="none" stroke="FG" stroke-width="9"/>';
const bowl = '<path d="M44 92h112a56 56 0 0 1-112 0z" fill="FG"/>';
const vase = '<path d="M86 44h28v18c18 12 26 30 26 50 0 28-18 44-40 44s-40-16-40-44c0-20 8-38 26-50z" fill="FG"/>';
const plate = '<circle cx="100" cy="100" r="58" fill="FG"/><circle cx="100" cy="100" r="38" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="3"/>';
const planter = '<path d="M58 78h84l-10 74H68z" fill="FG"/><rect x="52" y="66" width="96" height="16" rx="4" fill="FG"/>';
const tumbler = '<path d="M70 52h60l-8 100H78z" fill="FG"/>';

export const SAMPLE_PRODUCTS: Product[] = [
  { title: 'Speckled Stoneware Mug', sku: 'JC-MUG-01', description: 'Wheel-thrown stoneware mug with a speckled oatmeal glaze. Holds 12 oz. Dishwasher and microwave safe.', price: 32, image: svg('#efe8df', '#b9a58c', mug), vendor: 'Juniper & Clay', type: 'Drinkware', url: '' },
  { title: 'Sage Glaze Mug', sku: 'JC-MUG-02', description: 'Our everyday mug in a soft sage glaze with a comfortable, generous handle. Holds 12 oz.', price: 32, image: svg('#e4ebe3', '#7f9a83', mug), vendor: 'Juniper & Clay', type: 'Drinkware', url: '' },
  { title: 'Everyday Serving Bowl', sku: 'JC-BWL-01', description: 'A wide, shallow bowl for salads, pasta or fruit. Glazed inside, raw clay foot. 10 in diameter.', price: 58, image: svg('#ece6f0', '#8d7ba3', bowl), vendor: 'Juniper & Clay', type: 'Serveware', url: '' },
  { title: 'Bud Vase, Matte White', sku: 'JC-VAS-01', description: 'A small vase for single stems and dried flowers. Matte white glaze, 6 in tall.', price: 44, image: svg('#eef0f2', '#c8ccd2', vase), vendor: 'Juniper & Clay', type: 'Decor', url: '' },
  { title: 'Dinner Plate, Set of 2', sku: 'JC-PLT-02', description: 'Two 10.5 in dinner plates in a deep blue glaze with a raised rim. Stack neatly.', price: 64, image: svg('#e3ecf2', '#6e93ad', plate), vendor: 'Juniper & Clay', type: 'Dinnerware', url: '' },
  { title: 'Terracotta Planter, Medium', sku: 'JC-PLN-02', description: 'Unglazed terracotta planter with drainage hole and matching saucer. Fits a 6 in nursery pot.', price: 48, image: svg('#f4e6dd', '#c0775a', planter), vendor: 'Juniper & Clay', type: 'Planters', url: '' },
  { title: 'Ribbed Tumbler', sku: 'JC-TMB-01', description: 'Ribbed tumbler for water, juice or iced coffee. Holds 10 oz. Stacks for storage.', price: 26, image: svg('#f2eedd', '#bfa95a', tumbler), vendor: 'Juniper & Clay', type: 'Drinkware', url: '' },
  { title: 'Wide Pasta Bowl', sku: 'JC-BWL-03', description: 'A low, wide bowl made for pasta and grain bowls. Holds 28 oz.', price: 42, image: svg('#e6efe9', '#5f8f74', bowl), vendor: 'Juniper & Clay', type: 'Dinnerware', url: '' },
  { title: 'Tall Vase, Charcoal', sku: 'JC-VAS-03', description: 'A statement vase in charcoal glaze, 12 in tall, for branches and tall stems.', price: 72, image: svg('#e9e9ea', '#4c4f55', vase), vendor: 'Juniper & Clay', type: 'Decor', url: '' },
];
