# Image URL Migration Guide

## Problem

Product images were uploaded to R2 without folder prefixes (e.g., `1769082473630-4384.jpg`), but the image API now requires all images to be in specific folders (`product-images/`, `category-images/`, etc.) for security reasons.

## Solution

This migration does two things:
1. **Copies files in R2** from root level to appropriate folders
2. **Updates database URLs** to reflect the new file locations

## Before You Start

1. **Backup your database:**
   ```bash
   pg_dump your_database > backup.sql
   ```

2. **Verify R2 credentials** are set in `.env`:
   ```
   R2_API_KEY=https://[accountId].eu.r2.cloudflarestorage.com/[bucketName]
   R2_ACCESS_KEY=your_access_key
   R2_SECRET_KEY=your_secret_key
   DATABASE_URL=postgresql://...
   ```

## Running the Migration

### Step 1: Dry Run (Copy Only)

First, run without deleting old files to ensure everything works:

```bash
npx tsx scripts/migrate-r2-images.ts
```

This will:
- ✅ Copy files to new locations
- ✅ Update database URLs
- ❌ Keep old files (safe!)

### Step 2: Verify

1. Check your website - images should now load correctly
2. Verify in R2 dashboard that files exist in both locations
3. Check database to ensure URLs are updated

### Step 3: Clean Up (Optional)

Once you've verified everything works, run again with `--delete` to remove old files:

```bash
npx tsx scripts/migrate-r2-images.ts --delete
```

⚠️ **Warning:** This permanently deletes the old files!

## What Gets Migrated

The script automatically determines folders based on file types:

- **Images** (`.jpg`, `.png`, `.gif`, `.webp`) → `product-images/`
- **Design files** (`.pdf`, `.ai`, `.eps`, `.svg`, `.psd`) → `design-files/migrated/`
- **Other files** → `public-assets/`

## Database Updates

The script updates:
- `productImages.url` - Product image URLs
- `categories.imageUrl` - Category image URLs

## Troubleshooting

### "Access Denied" error
- Check your R2 API credentials
- Ensure the API token has "Object Read & Write" permissions

### "Bucket not found" error
- Verify `R2_API_KEY` includes the correct bucket name

### Files not loading after migration
- Check browser console for exact error
- Verify the file exists in R2 at the new location
- Check database URL matches the R2 key

### Some images still don't load
- They might have been uploaded with full paths already
- Check the database URL format
- Verify the folder is in the allowed list (`src/pages/api/images/[...path].ts`)

## Rollback

If something goes wrong:

1. Restore database from backup:
   ```bash
   psql your_database < backup.sql
   ```

2. Files in R2:
   - If you didn't use `--delete`, old files are still there
   - You can manually delete the new folders in R2 dashboard

## After Migration

New uploads will automatically:
- Be stored in `product-images/` folder
- Have correct URLs generated
- Work with the security validation

No further manual intervention needed!
