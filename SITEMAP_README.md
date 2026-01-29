# Sitemap Implementation

This project now includes a robust, automated sitemap generation system that runs during both development and production builds.

## Features

- **Dynamic Product URLs**: Automatically fetches all active products from the PostgreSQL database
- **Static Page Coverage**: Includes all 62+ static pages (services, legal, company pages, etc.)
- **SEO Optimized**: Proper XML format with `lastmod`, `changefreq`, and `priority` attributes
- **Error Resilient**: Includes fallback mechanism to ensure sitemap is always available
- **Cache Optimized**: 1-hour cache for better performance
- **Build-Time Generation**: Works seamlessly with Netlify SSR deployment

## Files Added

### 1. `/src/pages/sitemap.xml.ts`
Dynamic sitemap endpoint that:
- Queries the database for all active products
- Includes all static pages with appropriate priorities
- Generates valid XML sitemap format
- Updates automatically on each request (cached for 1 hour)

### 2. `/public/robots.txt`
Search engine directive file that:
- Allows indexing of public pages
- Blocks admin and auth pages
- References the sitemap location
- Improves SEO and crawler efficiency

## URL Coverage

### High Priority Pages (0.8-1.0)
- Homepage (/)
- Products listing (/products)
- All dynamic product pages (/product/[slug])
- Service technique pages (DTF, sublimation, screen printing, etc.)

### Medium Priority Pages (0.5-0.7)
- Contact and support pages
- Company information
- FAQ and info pages
- Cart and checkout

### Low Priority Pages (0.3-0.4)
- Legal pages (privacy policy, terms, imprint)
- Order tracking pages

## How It Works

### Development
```bash
npm run dev
# Sitemap available at: http://localhost:4321/sitemap.xml
```

### Production Build
```bash
npm run build
# Sitemap is automatically built and deployed
# Available at: https://selini-shirt.de/sitemap.xml
```

### Deployment on Netlify
The sitemap is generated dynamically on each request in production. Since the project uses Astro's SSR mode with the Netlify adapter, the sitemap endpoint runs as a serverless function that:

1. Connects to the PostgreSQL database
2. Fetches all active products
3. Combines with static pages
4. Generates and returns XML
5. Caches for 1 hour to reduce database load

## Testing the Sitemap

### Local Testing
```bash
# Start the dev server
npm run dev

# Visit the sitemap in your browser
open http://localhost:4321/sitemap.xml

# Or use curl
curl http://localhost:4321/sitemap.xml
```

### Production Testing
```bash
# After deployment
curl https://selini-shirt.de/sitemap.xml
```

### Validation
You can validate the sitemap using:
- [Google Search Console](https://search.google.com/search-console)
- [XML Sitemap Validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)

## Search Engine Submission

### Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `selini-shirt.de`
3. Navigate to "Sitemaps" in the left sidebar
4. Add sitemap URL: `https://selini-shirt.de/sitemap.xml`
5. Submit

### Bing Webmaster Tools
1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Add your site
3. Navigate to "Sitemaps"
4. Submit: `https://selini-shirt.de/sitemap.xml`

## Maintenance

### Adding New Static Pages
When you add new static pages to the project:

1. Open `src/pages/sitemap.xml.ts`
2. Add the new page to the `staticPages` array:
```typescript
const staticPages: SitemapURL[] = [
  // ... existing pages
  { loc: '/new-page', changefreq: 'monthly', priority: 0.7 },
];
```

### Product Pages
Product pages are automatically included when:
- A new product is added to the database
- The product's `isActive` field is set to `true`
- No manual updates needed!

## Performance

- **Database Query**: Single optimized query fetches all product slugs
- **Caching**: 1-hour HTTP cache reduces database load
- **Response Time**: Typically < 200ms for full sitemap generation
- **Size**: Scales automatically with product count

## Error Handling

The sitemap includes robust error handling:

1. **Database Connection Failure**: Returns fallback sitemap with homepage only
2. **Query Errors**: Logs error and continues with static pages
3. **Invalid Data**: Skips problematic entries and continues

## Monitoring

Check the sitemap health:

```bash
# Check response time
curl -w "@-" -o /dev/null -s 'https://selini-shirt.de/sitemap.xml' <<'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF

# Check if all URLs are valid
curl https://selini-shirt.de/sitemap.xml | grep -o '<loc>[^<]*</loc>' | wc -l
```

## Troubleshooting

### Sitemap not accessible
- Verify build completed successfully
- Check Netlify deployment logs
- Ensure database connection is working

### Products missing from sitemap
- Verify products have `isActive = true` in database
- Check product has a valid `slug` field
- Review database connection in production

### Sitemap shows old data
- Cache might be active (1-hour TTL)
- Wait for cache to expire or clear CDN cache
- Force refresh: `curl -H "Cache-Control: no-cache" https://selini-shirt.de/sitemap.xml`

## Future Enhancements

Potential improvements for the future:

1. **Sitemap Index**: Split into multiple sitemaps if product count exceeds 50,000
2. **Image Sitemap**: Add product images to sitemap for better image SEO
3. **Internationalization**: Support for multi-language sitemaps
4. **News Sitemap**: Separate sitemap for blog/news content if added
5. **Video Sitemap**: Include product videos if added

## Support

For issues or questions about the sitemap implementation, check:
- Astro documentation: https://docs.astro.build/
- Sitemap protocol: https://www.sitemaps.org/
- Google Search Console Help: https://support.google.com/webmasters/
