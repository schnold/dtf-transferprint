# Cloudflare R2 Integration for Product Images

This document describes the Cloudflare R2 integration for storing and managing product images.

## Overview

The application uses Cloudflare R2 (S3-compatible object storage) to store product images. R2 provides:
- **Zero egress fees** - No charges for data transfer out
- **S3-compatible API** - Works with existing AWS SDK tools
- **High performance** - Global CDN integration
- **Cost-effective** - Lower storage costs compared to AWS S3

## Architecture

### Components

1. **R2 Storage Client** (`src/lib/r2.ts`)
   - S3-compatible client configuration
   - Upload/delete functions
   - File validation
   - URL generation

2. **Image Upload API** (`src/pages/api/admin/products/upload-image.ts`)
   - POST: Upload multiple images
   - DELETE: Remove images
   - Automatic database synchronization

3. **Product API Updates** (`src/pages/api/admin/products/[id].ts`)
   - PATCH: Set primary image
   - Integrated with product management

4. **Image Upload Component** (`src/components/ProductImageUpload.astro`)
   - Reusable UI component
   - Drag-and-drop support
   - Image preview
   - Primary image management

## Environment Configuration

Required environment variables in `.env`:

```env
# R2 Configuration
R2_ACCESS_KEY=your_access_key_id
R2_SECRET_KEY=your_secret_access_key
R2_API_KEY=https://[accountId].eu.r2.cloudflarestorage.com/[bucketName]

# Optional: Custom domain for R2 bucket (if configured)
# If set, images will be served directly from this domain
# If not set, images will be served via the proxy endpoint at /api/images/{key}
R2_CUSTOM_DOMAIN=https://your-custom-domain.com
```

### Getting R2 Credentials

1. Go to Cloudflare Dashboard > R2
2. Create a bucket (if not exists)
3. Generate API tokens:
   - Navigate to R2 > Manage R2 API Tokens
   - Create API Token with "Object Read & Write" permissions
   - Copy Access Key ID and Secret Access Key
4. Get your bucket URL from the bucket settings

## Usage

### 1. Creating Products with Images

1. Navigate to `/admin/products/create`
2. Fill in product details
3. Click "Create Product"
4. You'll be redirected to the edit page
5. Upload images using the image upload section

### 2. Managing Product Images

On the product edit page (`/admin/products/[id]/edit`):

- **Upload New Images**: Select files and click "Upload Images"
- **Delete Images**: Hover over image and click the X button
- **Set Primary**: Hover over image and click "Set as Primary"
- **Reorder**: Images are displayed by display order

### 3. Image Best Practices

**Recommended Specifications:**
- Format: JPEG, PNG, WebP, or GIF
- Max Size: 10MB per image
- Recommended Resolution: 1200x1200px or higher
- Aspect Ratio: Square (1:1) for best results

**Optimization Tips:**
- Compress images before upload
- Use WebP format for better compression
- Keep file sizes under 2MB when possible
- Use descriptive filenames

## API Endpoints

### Upload Images
```
POST /api/admin/products/upload-image
Content-Type: multipart/form-data

Body:
- productId: string
- images: File[]
- isPrimary: boolean
```

### Delete Image
```
DELETE /api/admin/products/upload-image
Content-Type: application/json

Body:
{
  "imageId": "uuid"
}
```

### Set Primary Image
```
PATCH /api/admin/products/[id]
Content-Type: application/json

Body:
{
  "primaryImageId": "uuid"
}
```

### Test R2 Connection
```
GET /api/admin/test-r2
```

## Database Schema

Product images are stored in the `productImages` table:

```sql
CREATE TABLE "productImages" (
  id TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  "altText" TEXT,
  "isPrimary" BOOLEAN DEFAULT false,
  "displayOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Image URLs

Images are served through a proxy endpoint by default, which allows images to be displayed even if the R2 bucket is not publicly accessible.

### Default Proxy Endpoint (Recommended)

By default, images are served via the proxy endpoint:
```
/api/images/[timestamp]-[filename]
```

The proxy endpoint (`/api/images/[...path]`) fetches images from R2 and serves them with proper headers. This approach:
- Works even if the bucket is not publicly accessible
- Provides better security (no direct bucket access)
- Allows for additional processing/caching if needed

### Custom Domain (Optional)

If you have configured a custom domain for your R2 bucket, set the `R2_CUSTOM_DOMAIN` environment variable:

```env
R2_CUSTOM_DOMAIN=https://your-custom-domain.com
```

Images will then be served directly from your custom domain:
```
https://your-custom-domain.com/[timestamp]-[filename]
```

### Making Bucket Public (Alternative)

If you prefer to serve images directly from R2 without a proxy:

1. Go to Cloudflare Dashboard > R2
2. Select your bucket
3. Go to Settings > Public Access
4. Enable "Allow Access" or set up a custom domain
5. Set `R2_CUSTOM_DOMAIN` to your public bucket URL

## Performance Optimization

### Current Implementation
- Direct R2 uploads via S3 API
- Timestamp-based unique filenames
- Cache-Control headers set to 1 year
- Multiple images uploaded in parallel

### Future Enhancements
- [ ] Cloudflare Images integration for automatic resizing
- [ ] WebP conversion on upload
- [ ] Lazy loading for product images
- [ ] Image CDN caching
- [ ] Thumbnail generation

## Troubleshooting

### Connection Issues

Test your R2 connection:
```bash
curl http://localhost:4321/api/admin/test-r2
```

Common issues:
- **Invalid credentials**: Double-check R2_ACCESS_KEY and R2_SECRET_KEY
- **Bucket not found**: Verify R2_API_KEY includes correct bucket name
- **Permission denied**: Ensure API token has Read & Write permissions

### Upload Failures

Check:
- File size is under 10MB
- File type is supported (JPEG, PNG, WebP, GIF)
- Product exists in database
- User is authenticated as admin

### Images Not Displaying

Verify:
- Bucket is set to public access
- Image URLs are correct in database
- No CORS issues (check browser console)

## Security

### Current Measures
- Admin-only access to upload endpoints
- File type validation
- File size limits
- SQL injection protection via parameterized queries

### Best Practices
- Never expose R2 credentials to frontend
- Validate all file uploads server-side
- Implement rate limiting for uploads
- Regular security audits

## Cost Management

R2 Pricing (as of 2024):
- Storage: $0.015/GB/month
- Class A Operations (writes): $4.50/million
- Class B Operations (reads): $0.36/million
- **Egress: $0** (free!)

Estimated costs for typical usage:
- 1000 products with 3 images each = ~15GB = ~$0.23/month
- Very affordable for small to medium businesses

## Migration Notes

If migrating from another storage provider:

1. Update image URLs in database
2. Copy files to R2 bucket
3. Update `R2_API_KEY` in .env
4. Test with `/api/admin/test-r2`
5. Verify images display correctly

## Support

For issues or questions:
- Check Cloudflare R2 docs: https://developers.cloudflare.com/r2/
- Review application logs
- Contact system administrator
