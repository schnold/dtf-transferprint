import type { APIRoute } from 'astro';
import { r2Client, R2_BUCKET_NAME } from '../../../lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { pool } from '../../../lib/db';

// Ensure this endpoint is not prerendered
export const prerender = false;

/**
 * Allowed R2 path prefixes for public image access
 * Only images in these folders can be accessed via the proxy
 */
const ALLOWED_IMAGE_PREFIXES = [
  'product-images/',
  'category-images/',
  'branding/',
  'public-assets/',
  'design-files/', // Requires admin or order owner access
  'temp-uploads/', // Requires file owner access
];

/**
 * Validates that a path is safe and allowed
 * @param key - The R2 key to validate
 * @returns true if valid, false otherwise
 */
function isValidImagePath(key: string): boolean {
  // Reject empty or non-string keys
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Reject paths with path traversal attempts
  if (key.includes('..') || key.includes('~')) {
    return false;
  }

  // Normalize the path (remove double slashes, etc.)
  const normalized = key.replace(/\/+/g, '/').replace(/^\/+/, '');

  // Check if the normalized path starts with an allowed prefix
  const isAllowed = ALLOWED_IMAGE_PREFIXES.some(prefix =>
    normalized.startsWith(prefix)
  );

  if (!isAllowed) {
    return false;
  }

  // Additional checks: no null bytes, no control characters
  if (/[\x00-\x1f\x7f]/.test(normalized)) {
    return false;
  }

  return true;
}

/**
 * Check if user has access to a design file
 * Design files are stored as: design-files/{orderId}/{filename}
 * Access is granted to admins or the user who owns the order
 */
async function checkDesignFileAccess(key: string, userId: string | undefined, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true; // Admins can access all design files
  if (!userId) return false; // Must be logged in

  try {
    // Extract orderId from path: design-files/{orderId}/{filename}
    const parts = key.split('/');
    if (parts.length < 3) return false;
    const orderId = parts[1];

    // Check if user owns this order
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id FROM orders WHERE id = $1 AND "userId" = $2',
        [orderId, userId]
      );
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error checking design file access:', error);
    return false;
  }
}

/**
 * Check if user has access to a temp file
 * Temp files are stored as: temp-uploads/{userId}/{filename}
 * Access is granted only to the user who uploaded the file
 */
function checkTempFileAccess(key: string, userId: string | undefined): boolean {
  if (!userId) return false; // Must be logged in

  // Extract userId from path: temp-uploads/{userId}/{filename}
  const parts = key.split('/');
  if (parts.length < 3) return false;
  const fileUserId = parts[1];

  // User can only access their own temp files
  return fileUserId === userId;
}

/**
 * GET /api/images/[...path]
 * Proxy endpoint to serve images from R2
 * This allows images to be served even if the R2 bucket is not publicly accessible
 * Only allows access to images in allowlisted folders
 * Enforces access control for design files and temp uploads
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
  try {
    // Get the image path from the URL
    const path = params.path;
    if (!path) {
      console.warn('[SECURITY] Image proxy called without path');
      return new Response('Image path required', { status: 400 });
    }

    // Extract the key from the path (everything after /api/images/)
    const key = Array.isArray(path) ? path.join('/') : path;

    // Validate the path for security
    if (!isValidImagePath(key)) {
      console.warn('[SECURITY] Invalid or unauthorized image path requested:', { key });
      return new Response('Invalid image path', { status: 400 });
    }

    // ========================================
    // ACCESS CONTROL FOR PROTECTED FILES
    // ========================================
    const user = locals.user;
    const userId = user?.id;
    const isAdmin = user?.isAdmin || false;

    // Check access for design files (order files)
    if (key.startsWith('design-files/')) {
      const hasAccess = await checkDesignFileAccess(key, userId, isAdmin);
      if (!hasAccess) {
        console.warn('[SECURITY] Unauthorized design file access attempt:', { key, userId });
        return new Response('Forbidden - You do not have access to this file', { status: 403 });
      }
    }

    // Check access for temp uploads
    if (key.startsWith('temp-uploads/')) {
      const hasAccess = checkTempFileAccess(key, userId);
      if (!hasAccess) {
        console.warn('[SECURITY] Unauthorized temp file access attempt:', { key, userId });
        return new Response('Forbidden - You do not have access to this file', { status: 403 });
      }
    }

    console.log('[Image Proxy] Fetching image:', { key, bucket: R2_BUCKET_NAME });

    // Get the object from R2
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    try {
      const response = await r2Client.send(command);

      // Get the content type from the response or default to image
      const contentType = response.ContentType || 'image/jpeg';
      const contentLength = response.ContentLength || 0;
      const lastModified = response.LastModified;

      // Convert the stream to a buffer
      // In Node.js/Astro, Body is a Readable stream from @aws-sdk/lib-storage
      let buffer: Buffer;
      if (response.Body) {
        const chunks: Buffer[] = [];
        // @ts-ignore - Body is a Node.js Readable stream
        for await (const chunk of response.Body) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        buffer = Buffer.concat(chunks);
      } else {
        return new Response('No image data', { status: 500 });
      }

      // Return the image with appropriate headers
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': contentLength.toString(),
          'Cache-Control': 'public, max-age=31536000, immutable',
          ...(lastModified && {
            'Last-Modified': lastModified.toUTCString(),
          }),
        },
      });
    } catch (error: any) {
      // If object not found, return 404
      if (error?.Code === 'NoSuchKey' || error?.name === 'NoSuchKey') {
        console.error('[Image Proxy] Image not found in R2:', { key, error: error.message });
        return new Response('Image not found', { status: 404 });
      }

      console.error('[Image Proxy] Error fetching image from R2:', { 
        key, 
        bucket: R2_BUCKET_NAME,
        error: error.message,
        code: error?.Code,
        name: error?.name 
      });
      return new Response(`Error fetching image: ${error?.message || 'Unknown error'}`, { status: 500 });
    }
  } catch (error) {
    console.error('Error in image proxy:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
