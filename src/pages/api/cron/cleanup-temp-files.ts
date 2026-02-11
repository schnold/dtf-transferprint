/**
 * Vercel Cron API Endpoint
 * Runs temp file cleanup job
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-temp-files",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */

import type { APIRoute } from 'astro';
import { runCleanup } from '../../../jobs/cleanup-temp-files';

export const GET: APIRoute = async ({ request }) => {
  // Verify request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, verify the request
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cleanup Cron] Unauthorized access attempt');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('[Cleanup Cron] Starting scheduled cleanup...');
    const result = await runCleanup();

    return new Response(
      JSON.stringify({
        success: result.success,
        deletedCount: result.deletedCount,
        failedCount: result.failedCount,
        errors: result.errors,
        duration: result.duration,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[Cleanup Cron] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
