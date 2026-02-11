/**
 * Migration script to move existing R2 images into proper folders
 * This script:
 * 1. Lists all objects in R2 at the root level
 * 2. Copies them to product-images/ folder
 * 3. Updates database URLs
 * 4. Optionally deletes the old files
 */

import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Pool } from 'pg';
import 'dotenv/config';

// R2 Configuration
const R2_ENDPOINT = process.env.R2_API_KEY || '';
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || '';
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || '';

const urlParts = R2_ENDPOINT.split('/');
const bucketName = urlParts[urlParts.length - 1];
const accountEndpoint = urlParts.slice(0, -1).join('/');

const r2Client = new S3Client({
  region: 'auto',
  endpoint: accountEndpoint,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface MigrationStats {
  totalFiles: number;
  copiedFiles: number;
  deletedFiles: number;
  updatedDatabaseRecords: number;
  errors: string[];
}

/**
 * Check if a key is at root level (no folder prefix)
 */
function isRootLevelKey(key: string): boolean {
  return !key.includes('/');
}

/**
 * Determine the appropriate folder for a file based on patterns
 */
function determineFolder(key: string): string {
  // If already has a folder, keep it
  if (key.includes('/')) {
    return '';
  }

  // Default to product-images for image files
  if (key.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return 'product-images';
  }

  // Design files
  if (key.match(/\.(pdf|ai|eps|svg|psd)$/i)) {
    return 'design-files/migrated';
  }

  // Default
  return 'public-assets';
}

/**
 * Copy file in R2 from root to folder
 */
async function copyFileInR2(oldKey: string, newKey: string): Promise<boolean> {
  try {
    const copyCommand = new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${oldKey}`,
      Key: newKey,
    });

    await r2Client.send(copyCommand);
    console.log(`✓ Copied: ${oldKey} → ${newKey}`);
    return true;
  } catch (error: any) {
    console.error(`✗ Failed to copy ${oldKey}:`, error.message);
    return false;
  }
}

/**
 * Delete file from R2
 */
async function deleteFileInR2(key: string): Promise<boolean> {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await r2Client.send(deleteCommand);
    console.log(`✓ Deleted: ${key}`);
    return true;
  } catch (error: any) {
    console.error(`✗ Failed to delete ${key}:`, error.message);
    return false;
  }
}

/**
 * Update database URLs
 */
async function updateDatabaseUrls(): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update productImages
    const result1 = await client.query(`
      UPDATE "productImages"
      SET url = '/api/images/product-images/' || REPLACE(url, '/api/images/', '')
      WHERE url LIKE '/api/images/%'
        AND url NOT LIKE '/api/images/product-images/%'
        AND url NOT LIKE '/api/images/category-images/%'
        AND url NOT LIKE '/api/images/design-files/%'
        AND url NOT LIKE '/api/images/branding/%'
        AND url NOT LIKE '/api/images/public-assets/%'
    `);

    // Update categories
    const result2 = await client.query(`
      UPDATE categories
      SET "imageUrl" = '/api/images/category-images/' || REPLACE("imageUrl", '/api/images/', '')
      WHERE "imageUrl" IS NOT NULL
        AND "imageUrl" LIKE '/api/images/%'
        AND "imageUrl" NOT LIKE '/api/images/product-images/%'
        AND "imageUrl" NOT LIKE '/api/images/category-images/%'
        AND "imageUrl" NOT LIKE '/api/images/design-files/%'
        AND "imageUrl" NOT LIKE '/api/images/branding/%'
        AND "imageUrl" NOT LIKE '/api/images/public-assets/%'
    `);

    await client.query('COMMIT');

    const totalUpdated = (result1.rowCount || 0) + (result2.rowCount || 0);
    console.log(`✓ Updated ${totalUpdated} database records`);
    return totalUpdated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main migration function
 */
async function migrateImages(deleteOldFiles: boolean = false): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalFiles: 0,
    copiedFiles: 0,
    deletedFiles: 0,
    updatedDatabaseRecords: 0,
    errors: [],
  };

  try {
    console.log('🔍 Listing files in R2...');

    // List all objects in the bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    const response = await r2Client.send(listCommand);
    const objects = response.Contents || [];

    console.log(`Found ${objects.length} files in R2\n`);

    // Filter root-level files
    const rootFiles = objects.filter(obj => obj.Key && isRootLevelKey(obj.Key));
    stats.totalFiles = rootFiles.length;

    console.log(`Found ${rootFiles.length} root-level files to migrate\n`);

    if (rootFiles.length === 0) {
      console.log('✓ No files to migrate!');
      return stats;
    }

    // Copy each file
    for (const obj of rootFiles) {
      const oldKey = obj.Key!;
      const folder = determineFolder(oldKey);
      const newKey = `${folder}/${oldKey}`;

      console.log(`Migrating: ${oldKey} → ${newKey}`);

      const copied = await copyFileInR2(oldKey, newKey);
      if (copied) {
        stats.copiedFiles++;

        // Delete old file if requested
        if (deleteOldFiles) {
          const deleted = await deleteFileInR2(oldKey);
          if (deleted) {
            stats.deletedFiles++;
          }
        }
      } else {
        stats.errors.push(`Failed to copy ${oldKey}`);
      }
    }

    // Update database
    console.log('\n📝 Updating database URLs...');
    stats.updatedDatabaseRecords = await updateDatabaseUrls();

    return stats;
  } catch (error: any) {
    console.error('Migration failed:', error);
    stats.errors.push(error.message);
    return stats;
  } finally {
    await pool.end();
  }
}

// Run migration
const deleteOldFiles = process.argv.includes('--delete');

console.log('🚀 Starting R2 Image Migration');
console.log(`Delete old files: ${deleteOldFiles ? 'YES' : 'NO'}`);
console.log('=====================================\n');

migrateImages(deleteOldFiles)
  .then((stats) => {
    console.log('\n=====================================');
    console.log('✅ Migration completed!');
    console.log(`Total files found: ${stats.totalFiles}`);
    console.log(`Files copied: ${stats.copiedFiles}`);
    console.log(`Files deleted: ${stats.deletedFiles}`);
    console.log(`Database records updated: ${stats.updatedDatabaseRecords}`);
    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors (${stats.errors.length}):`);
      stats.errors.forEach(err => console.log(`  - ${err}`));
    }
    process.exit(stats.errors.length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
