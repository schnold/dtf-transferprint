/**
 * Cleanup Job for Temporary Files
 * Deletes expired temporary files from R2 storage and database
 * Should be run daily via cron job (e.g., Vercel Cron)
 */

import { cleanupExpiredTempFiles } from '../lib/file-migration';

/**
 * Main cleanup function
 * Can be called from a cron endpoint or scheduled task
 */
export async function runCleanup() {
  console.log('[Cleanup Job] Starting temp files cleanup...');
  const startTime = Date.now();

  try {
    const result = await cleanupExpiredTempFiles();

    const duration = Date.now() - startTime;
    console.log('[Cleanup Job] Cleanup completed', {
      deletedCount: result.deletedCount,
      failedCount: result.failedCount,
      duration: `${duration}ms`,
      errors: result.errors,
    });

    return {
      success: true,
      ...result,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[Cleanup Job] Cleanup failed:', error);

    return {
      success: false,
      deletedCount: 0,
      failedCount: 0,
      errors: [error.message || 'Unknown error'],
      duration,
    };
  }
}

// If running directly (not via import)
if (import.meta.url === `file://${process.argv[1]}`) {
  runCleanup()
    .then((result) => {
      console.log('Cleanup result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Cleanup error:', error);
      process.exit(1);
    });
}
