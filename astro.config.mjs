import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://example.com', // keep in sync with src/site.config.ts
  integrations: [sitemap()],
  trailingSlash: 'always',
});
