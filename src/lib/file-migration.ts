/**
 * File Migration Utility
 * Handles migration of files from temporary storage to permanent storage
 * after successful payment completion
 */

import { CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, getR2PublicUrl } from './r2';
import { pool } from './db';

export interface FileMigrationResult {
  success: boolean;
  tempUrl: string;
  permanentUrl?: string;
  error?: string;
}

export interface MigrationSummary {
  success: boolean;
  urlMapping: Map<string, string>; // tempUrl -> permanentUrl
  errors: string[];
}

/**
 * Extract R2 key from file URL
 * URL format: /api/images/temp-uploads/userId/timestamp-filename
 * or https://custom-domain.com/temp-uploads/userId/timestamp-filename
 */
function extractKeyFromUrl(fileUrl: string): string | null {
  try {
    // Remove /api/images/ prefix if present
    let key = fileUrl.replace(/^\/api\/images\//, '');

    // Remove custom domain if present
    const urlObj = new URL(fileUrl, 'http://dummy.com');
    key = urlObj.pathname.replace(/^\//, '');

    // Remove /api/images/ prefix again after URL parsing
    key = key.replace(/^api\/images\//, '');

    return key;
  } catch (error) {
    console.error('Error extracting key from URL:', fileUrl, error);
    return null;
  }
}

/**
 * Migrate a single file from temp storage to permanent storage
 * Uses R2 CopyObjectCommand for server-side copy (no download/upload)
 */
export async function migrateFileToPermanent(
  tempUrl: string,
  orderId: string,
  fileName: string
): Promise<FileMigrationResult> {
  try {
    // Extract source key from temp URL
    const sourceKey = extractKeyFromUrl(tempUrl);
    if (!sourceKey) {
      return {
        success: false,
        tempUrl,
        error: 'Invalid temp file URL format',
      };
    }

    // Verify it's a temp file
    if (!sourceKey.startsWith('temp-uploads/')) {
      return {
        success: false,
        tempUrl,
        error: 'File is not in temporary storage',
      };
    }

    // Generate destination key: design-files/{orderId}/{filename}
    // Extract just the filename from the temp path
    const tempFileName = sourceKey.split('/').pop() || fileName;
    const destinationKey = `design-files/${orderId}/${tempFileName}`;

    // Copy file in R2 (server-side copy, very fast)
    const copyCommand = new CopyObjectCommand({
      Bucket: R2_BUCKET_NAME,
      CopySource: `${R2_BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey,
      MetadataDirective: 'COPY', // Copy metadata from source
    });

    await r2Client.send(copyCommand);

    // Generate permanent public URL
    const permanentUrl = getR2PublicUrl(destinationKey);

    return {
      success: true,
      tempUrl,
      permanentUrl,
    };
  } catch (error: any) {
    console.error('Error migrating file:', tempUrl, error);
    return {
      success: false,
      tempUrl,
      error: error.message || 'File migration failed',
    };
  }
}

/**
 * Migrate all cart files to permanent storage
 * Called during payment capture after PayPal payment is successful
 */
export async function migrateCartFilesToPermanent(
  cartItems: Array<{
    uploadedFileUrl: string | null;
    uploadedFileName: string | null;
  }>,
  orderId: string,
  userId: string
): Promise<MigrationSummary> {
  const urlMapping = new Map<string, string>();
  const errors: string[] = [];
  const client = await pool.connect();

  try {
    // Filter cart items that have uploaded files
    const itemsWithFiles = cartItems.filter(
      (item) => item.uploadedFileUrl && item.uploadedFileUrl.includes('temp-uploads/')
    );

    if (itemsWithFiles.length === 0) {
      // No files to migrate, success by default
      return { success: true, urlMapping, errors: [] };
    }

    // Migrate each file
    const migrationPromises = itemsWithFiles.map(async (item) => {
      const tempUrl = item.uploadedFileUrl!;
      const fileName = item.uploadedFileName || 'file';

      const result = await migrateFileToPermanent(tempUrl, orderId, fileName);

      if (result.success && result.permanentUrl) {
        urlMapping.set(tempUrl, result.permanentUrl);

        // Update tempUploadedFiles table
        try {
          await client.query(
            `UPDATE "tempUploadedFiles"
             SET "permanentFileUrl" = $1,
                 "isMigrated" = TRUE,
                 "migratedAt" = NOW(),
                 "orderId" = $2
             WHERE "tempFileUrl" = $3 AND "userId" = $4`,
            [result.permanentUrl, orderId, tempUrl, userId]
          );
        } catch (dbError: any) {
          console.error('Failed to update tempUploadedFiles:', dbError);
          errors.push(`Database update failed for ${fileName}: ${dbError.message}`);
        }
      } else {
        errors.push(`Failed to migrate ${fileName}: ${result.error}`);
      }

      return result;
    });

    // Wait for all migrations to complete
    const results = await Promise.all(migrationPromises);

    // Check if all migrations succeeded
    const allSucceeded = results.every((r) => r.success);

    return {
      success: allSucceeded,
      urlMapping,
      errors,
    };
  } catch (error: any) {
    console.error('Error in migrateCartFilesToPermanent:', error);
    return {
      success: false,
      urlMapping,
      errors: [error.message || 'Migration failed'],
    };
  } finally {
    client.release();
  }
}

/**
 * Delete temporary file from R2 storage
 * Used by cleanup job to remove expired temp files
 */
export async function deleteTempFile(tempUrl: string): Promise<boolean> {
  try {
    const key = extractKeyFromUrl(tempUrl);
    if (!key) {
      console.error('Invalid temp file URL:', tempUrl);
      return false;
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(deleteCommand);
    return true;
  } catch (error: any) {
    console.error('Error deleting temp file:', tempUrl, error);
    return false;
  }
}

/**
 * Clean up expired temp files
 * This function is called by the cleanup job
 */
export async function cleanupExpiredTempFiles(): Promise<{
  deletedCount: number;
  failedCount: number;
  errors: string[];
}> {
  const client = await pool.connect();
  let deletedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  try {
    // Find expired temp files that haven't been migrated
    const result = await client.query(
      `SELECT id, "tempFileUrl", "fileName"
       FROM "tempUploadedFiles"
       WHERE "expiresAt" < NOW() AND "isMigrated" = FALSE
       LIMIT 100` // Process in batches
    );

    const expiredFiles = result.rows;

    if (expiredFiles.length === 0) {
      console.log('No expired temp files to clean up');
      return { deletedCount: 0, failedCount: 0, errors: [] };
    }

    console.log(`Found ${expiredFiles.length} expired temp files to clean up`);

    // Delete each file
    for (const file of expiredFiles) {
      try {
        // Delete from R2
        const deleted = await deleteTempFile(file.tempFileUrl);

        if (deleted) {
          // Delete from database
          await client.query(`DELETE FROM "tempUploadedFiles" WHERE id = $1`, [file.id]);
          deletedCount++;
          console.log(`Deleted expired temp file: ${file.fileName}`);
        } else {
          failedCount++;
          errors.push(`Failed to delete R2 file: ${file.fileName}`);
        }
      } catch (error: any) {
        failedCount++;
        errors.push(`Error deleting ${file.fileName}: ${error.message}`);
        console.error(`Error deleting temp file ${file.id}:`, error);
      }
    }

    return { deletedCount, failedCount, errors };
  } catch (error: any) {
    console.error('Error in cleanupExpiredTempFiles:', error);
    return { deletedCount, failedCount, errors: [error.message] };
  } finally {
    client.release();
  }
}
