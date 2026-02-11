import type { APIRoute } from 'astro';
import { pool } from '@/lib/db';
import { textilthemenSlugs, sportbekleidungSlugs } from '@/data/themen';

// Define your site URL
const SITE_URL = import.meta.env.PUBLIC_BETTER_AUTH_URL || 'https://selini-shirt.de';

interface SitemapURL {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

// Static pages with their metadata
const staticPages: SitemapURL[] = [
  // Main pages
  { loc: '/', changefreq: 'daily', priority: 1.0 },
  { loc: '/products', changefreq: 'daily', priority: 0.9 },
  { loc: '/kontakt', changefreq: 'monthly', priority: 0.7 },
  { loc: '/beratung', changefreq: 'monthly', priority: 0.7 },
  { loc: '/support', changefreq: 'monthly', priority: 0.7 },

  // Company pages
  { loc: '/ueber-uns', changefreq: 'monthly', priority: 0.6 },
  { loc: '/team', changefreq: 'monthly', priority: 0.5 },
  { loc: '/karriere', changefreq: 'monthly', priority: 0.5 },
  { loc: '/unternehmen', changefreq: 'monthly', priority: 0.6 },

  // Themen (overview) and Arbeitskleidung
  { loc: '/themen', changefreq: 'monthly', priority: 0.7 },
  { loc: '/arbeitskleidung/kasacks-besticken-medizin-bekleidung', changefreq: 'monthly', priority: 0.6 },

  // Info pages
  { loc: '/faq', changefreq: 'monthly', priority: 0.7 },
  { loc: '/eigenschaften', changefreq: 'monthly', priority: 0.6 },
  { loc: '/dtf-haltbarkeit', changefreq: 'monthly', priority: 0.7 },
  { loc: '/dtf-ratgeber-und-infos', changefreq: 'monthly', priority: 0.7 },
  { loc: '/infos-zu-printpunk', changefreq: 'monthly', priority: 0.6 },
  { loc: '/druckvorlagen', changefreq: 'monthly', priority: 0.6 },
  { loc: '/mustermappe', changefreq: 'monthly', priority: 0.6 },

  // Service/Technique pages
  { loc: '/siebdruck', changefreq: 'monthly', priority: 0.8 },
  { loc: '/dtf-transfers', changefreq: 'monthly', priority: 0.8 },
  { loc: '/dtf-druck', changefreq: 'monthly', priority: 0.8 },
  { loc: '/sublimation', changefreq: 'monthly', priority: 0.8 },
  { loc: '/flex-und-flockfoliendruck', changefreq: 'monthly', priority: 0.8 },
  { loc: '/direkteinstickung', changefreq: 'monthly', priority: 0.8 },
  { loc: '/einzelnamendruck', changefreq: 'monthly', priority: 0.7 },
  { loc: '/einzelnamenstick', changefreq: 'monthly', priority: 0.7 },
  { loc: '/flex-flock-einzelnamen-bedrucken', changefreq: 'monthly', priority: 0.7 },
  { loc: '/plastisol-transfer', changefreq: 'monthly', priority: 0.7 },
  { loc: '/reflex-transfer', changefreq: 'monthly', priority: 0.7 },
  { loc: '/gewebte-aufnaeher', changefreq: 'monthly', priority: 0.7 },
  { loc: '/gewebte-label', changefreq: 'monthly', priority: 0.7 },
  { loc: '/stick-patches', changefreq: 'monthly', priority: 0.7 },
  { loc: '/blockout', changefreq: 'monthly', priority: 0.6 },

  // Legal pages
  { loc: '/rechtliches/impressum', changefreq: 'yearly', priority: 0.3 },
  { loc: '/rechtliches/datenschutz', changefreq: 'yearly', priority: 0.3 },
  { loc: '/rechtliches/cookies', changefreq: 'yearly', priority: 0.3 },
  { loc: '/rechtliches/nutzungsbedingungen', changefreq: 'yearly', priority: 0.3 },

  // E-commerce pages (excluding auth/admin/dynamic)
  { loc: '/cart', changefreq: 'daily', priority: 0.5 },
  { loc: '/checkout', changefreq: 'daily', priority: 0.5 },
  { loc: '/orders', changefreq: 'weekly', priority: 0.4 },
];

/** Build themen URLs from data/themen – updates automatically when themes are added. */
function getThemenUrls(): SitemapURL[] {
  const urls: SitemapURL[] = [];
  const currentDate = new Date().toISOString();

  // Textilthemen: /themen/[slug]/
  for (const slug of Object.keys(textilthemenSlugs)) {
    urls.push({
      loc: `/themen/${slug}/`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: 0.7,
    });
  }

  // Sportbekleidung: /themen/sportbekleidung-bedrucken/[slug]/
  for (const slug of Object.keys(sportbekleidungSlugs)) {
    urls.push({
      loc: `/themen/sportbekleidung-bedrucken/${slug}/`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: 0.7,
    });
  }

  return urls;
}

async function getProductUrls(): Promise<SitemapURL[]> {
  const client = await pool.connect();
  try {
    // Fetch all active products with their last update time
    const result = await client.query(`
      SELECT
        slug,
        "updatedAt"
      FROM products
      WHERE "isActive" = true
      ORDER BY "updatedAt" DESC
    `);

    return result.rows.map((row) => ({
      loc: `/product/${row.slug}`,
      lastmod: new Date(row.updatedAt).toISOString(),
      changefreq: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error('Error fetching products for sitemap:', error);
    return [];
  } finally {
    client.release();
  }
}

function generateSitemapXML(urls: SitemapURL[]): string {
  const urlEntries = urls
    .map((url) => {
      const lastmod = url.lastmod ? `\n    <lastmod>${url.lastmod}</lastmod>` : '';
      const changefreq = url.changefreq ? `\n    <changefreq>${url.changefreq}</changefreq>` : '';
      const priority = url.priority !== undefined ? `\n    <priority>${url.priority.toFixed(1)}</priority>` : '';

      return `  <url>
    <loc>${SITE_URL}${url.loc}</loc>${lastmod}${changefreq}${priority}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

export const GET: APIRoute = async () => {
  try {
    // Get product URLs from database (dynamic: new products appear automatically)
    const productUrls = await getProductUrls();

    // Get themen URLs from data/themen (dynamic: new themes in data file appear automatically)
    const themenUrls = getThemenUrls();

    // Get current date for lastmod of static pages
    const currentDate = new Date().toISOString();

    // Add lastmod to static pages
    const staticPagesWithDate = staticPages.map(page => ({
      ...page,
      lastmod: page.lastmod || currentDate,
    }));

    // Combine all URLs: static + themen content + products
    const allUrls = [...staticPagesWithDate, ...themenUrls, ...productUrls];

    // Generate sitemap XML
    const sitemap = generateSitemapXML(allUrls);

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);

    // Return a basic sitemap with just the homepage on error
    const fallbackSitemap = generateSitemapXML([
      { loc: '/', lastmod: new Date().toISOString(), changefreq: 'daily', priority: 1.0 }
    ]);

    return new Response(fallbackSitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  }
};
