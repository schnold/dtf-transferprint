import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import 'dotenv/config';

// Extract bucket name and endpoint from R2_API_KEY
// Format: https://[accountId].eu.r2.cloudflarestorage.com/[bucketName]
const R2_ENDPOINT = process.env.R2_API_KEY || '';
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || '';
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || '';

// Validate required environment variables
if (!R2_ENDPOINT) {
  console.error('R2_API_KEY environment variable is not set');
}
if (!R2_ACCESS_KEY) {
  console.error('R2_ACCESS_KEY environment variable is not set');
}
if (!R2_SECRET_KEY) {
  console.error('R2_SECRET_KEY environment variable is not set');
}

const urlParts = R2_ENDPOINT.split('/');
const bucketName = urlParts[urlParts.length - 1];
const accountEndpoint = urlParts.slice(0, -1).join('/');

// R2-specific endpoint (without bucket name)
const r2Endpoint = accountEndpoint;

// Initialize S3 client for R2
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

export const R2_BUCKET_NAME = bucketName;

// Support custom domain if provided, otherwise use proxy endpoint
// R2_CUSTOM_DOMAIN should be set if you have a custom domain configured for your R2 bucket
// Format: https://your-custom-domain.com or https://your-bucket.r2.dev
const R2_CUSTOM_DOMAIN = process.env.R2_CUSTOM_DOMAIN || '';

// Generate public URL - use custom domain if available, otherwise use proxy endpoint
export function getR2PublicUrl(key: string): string {
  if (R2_CUSTOM_DOMAIN) {
    // Remove trailing slash if present
    const domain = R2_CUSTOM_DOMAIN.replace(/\/$/, '');
    return `${domain}/${key}`;
  }
  
  // Use proxy endpoint - this works even if bucket is not publicly accessible
  // The proxy endpoint will fetch from R2 and serve the image
  return `/api/images/${key}`;
}

// Legacy export for backward compatibility (deprecated - use getR2PublicUrl instead)
export const R2_PUBLIC_URL = R2_CUSTOM_DOMAIN 
  ? R2_CUSTOM_DOMAIN.replace(/\/$/, '')
  : '/api/images';

/**
 * Upload a file to R2
 * @param file - File buffer
 * @param fileName - Name for the file in R2 (or full path if already includes folder)
 * @param contentType - MIME type of the file
 * @param folder - Optional folder prefix (e.g., 'product-images', 'category-images'). If not provided and fileName doesn't include a folder, 'product-images' will be used.
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder?: string
): Promise<string> {
  try {
    // Generate unique filename to prevent collisions
    const timestamp = Date.now();

    // Check if fileName already includes a folder path (e.g., 'design-files/user123/file.pdf')
    const hasFolder = fileName.includes('/');

    let uniqueFileName: string;
    if (hasFolder) {
      // File already has full path, just use it as-is
      uniqueFileName = fileName;
    } else {
      // Add folder prefix if specified, otherwise default to product-images for backward compatibility
      const folderPrefix = folder ? (folder.endsWith('/') ? folder : `${folder}/`) : 'product-images/';
      uniqueFileName = `${folderPrefix}${timestamp}-${fileName}`;
    }

    const upload = new Upload({
      client: r2Client,
      params: {
        Bucket: R2_BUCKET_NAME,
        Key: uniqueFileName,
        Body: file,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      },
    });

    await upload.done();

    // Return public URL using the new function
    return getR2PublicUrl(uniqueFileName);
  } catch (error: any) {
    console.error('Error uploading to R2:', error);

    // Provide more specific error messages
    if (error?.Code === 'AccessDenied' || error?.name === 'AccessDenied') {
      throw new Error(
        'Access Denied: Check your R2 credentials (R2_ACCESS_KEY and R2_SECRET_KEY) and ensure the API token has "Object Read & Write" permissions'
      );
    }

    if (error?.Code === 'NoSuchBucket' || error?.name === 'NoSuchBucket') {
      throw new Error(
        `Bucket not found: "${R2_BUCKET_NAME}". Verify your R2_API_KEY includes the correct bucket name.`
      );
    }

    throw new Error(
      `Failed to upload file to R2: ${error?.message || 'Unknown error'}`
    );
  }
}

/**
 * Upload multiple files to R2
 * @param files - Array of file buffers with metadata
 * @param folder - Optional folder prefix for all files
 * @returns Array of public URLs
 */
export async function uploadMultipleToR2(
  files: { buffer: Buffer; fileName: string; contentType: string }[],
  folder?: string
): Promise<string[]> {
  try {
    const uploadPromises = files.map((file) =>
      uploadToR2(file.buffer, file.fileName, file.contentType, folder)
    );

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple files to R2:', error);
    throw new Error('Failed to upload files to R2');
  }
}

/**
 * Delete a file from R2
 * @param fileUrl - Public URL of the file to delete
 * @returns Success boolean
 */
export async function deleteFromR2(fileUrl: string): Promise<boolean> {
  try {
    // Extract key from URL
    // Handle both custom domain and proxy endpoint URLs
    let key = fileUrl;
    
    if (R2_CUSTOM_DOMAIN) {
      // Remove custom domain prefix
      const domain = R2_CUSTOM_DOMAIN.replace(/\/$/, '');
      key = fileUrl.replace(`${domain}/`, '');
    } else {
      // Remove proxy endpoint prefix
      key = fileUrl.replace(/^\/api\/images\//, '');
    }

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting from R2:', error);
    return false;
  }
}

/**
 * Delete multiple files from R2
 * @param fileUrls - Array of public URLs to delete
 * @returns Success boolean
 */
export async function deleteMultipleFromR2(fileUrls: string[]): Promise<boolean> {
  try {
    const deletePromises = fileUrls.map((url) => deleteFromR2(url));
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error('Error deleting multiple files from R2:', error);
    return false;
  }
}

/**
 * Validate image file
 * @param file - File object
 * @param maxSizeMB - Maximum file size in MB
 * @returns Validation result
 */
export function validateImageFile(
  file: { size: number; type: string },
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.',
    };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit.`,
    };
  }

  return { valid: true };
}

/**
 * Validate design file (for customer uploads)
 * @param file - File object
 * @param maxSizeMB - Maximum file size in MB
 * @returns Validation result
 */
export function validateDesignFile(
  file: { size: number; type: string; name: string },
  maxSizeMB: number = 255
): { valid: boolean; error?: string } {
  const allowedTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/postscript', // .ai, .eps
    'image/svg+xml',
    'application/illustrator', // .ai
    'application/x-photoshop', // .psd
  ];

  // Also check file extension as backup
  const fileName = file.name.toLowerCase();
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.ai', '.eps', '.svg', '.psd'];
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

  if (!allowedTypes.includes(file.type) && !hasValidExtension) {
    return {
      valid: false,
      error: 'Invalid file type. Only PDF, PNG, JPG, AI, EPS, SVG, and PSD files are allowed.',
    };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit.`,
    };
  }

  return { valid: true };
}

/**
 * Generate optimized image variants (thumbnail, medium, large)
 * Note: For production, consider using Cloudflare Image Resizing or a separate image processing service
 */
export interface ImageVariants {
  original: string;
  thumbnail?: string;
  medium?: string;
  large?: string;
}
