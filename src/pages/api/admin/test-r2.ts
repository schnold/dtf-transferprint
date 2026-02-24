import type { APIRoute } from 'astro';
import { r2Client, R2_BUCKET_NAME, getR2PublicUrl } from '../../../lib/r2';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

/**
 * GET /api/admin/test-r2
 * Test R2 connection and configuration
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check if user is admin
    const user = locals.user;
    if (!user?.isAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Unauthorized - Admin access required' },
        }),
        { status: 403 }
      );
    }

    // Test R2 connection by listing objects (limit to 5)
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 5,
    });

    const response = await r2Client.send(command);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          message: 'R2 connection successful!',
          config: {
            bucketName: R2_BUCKET_NAME,
            publicUrlPattern: '/api/images/{key}',
            objectCount: response.KeyCount || 0,
            sampleObjects: (response.Contents || []).map((obj) => ({
              key: obj.Key,
              url: obj.Key ? getR2PublicUrl(obj.Key) : null,
              size: obj.Size,
              lastModified: obj.LastModified,
            })),
          },
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('R2 connection test failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'R2 connection failed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
