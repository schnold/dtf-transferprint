import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import 'dotenv/config';

// Extract bucket name and endpoint from R2_API_KEY
// Format: https://[accountId].eu.r2.cloudflarestorage.com/[bucketName]
const R2_ENDPOINT = process.env.R2_API_KEY || '';
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
    accessKeyId: process.env.R2_ACCESS_KEY || '',
    secretAccessKey: process.env.R2_SECRET_KEY || '',
  },
});

export const R2_BUCKET_NAME = bucketName;
export const R2_PUBLIC_URL = `${r2Endpoint}/${bucketName}`;

/**
 * Upload a file to R2
 * @param file - File buffer
 * @param fileName - Name for the file in R2
 * @param contentType - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  try {
    // Generate unique filename to prevent collisions
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName}`;

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

    // Return public URL
    return `${R2_PUBLIC_URL}/${uniqueFileName}`;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw new Error('Failed to upload file to R2');
  }
}

/**
 * Upload multiple files to R2
 * @param files - Array of file buffers with metadata
 * @returns Array of public URLs
 */
export async function uploadMultipleToR2(
  files: { buffer: Buffer; fileName: string; contentType: string }[]
): Promise<string[]> {
  try {
    const uploadPromises = files.map((file) =>
      uploadToR2(file.buffer, file.fileName, file.contentType)
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
    const key = fileUrl.replace(`${R2_PUBLIC_URL}/`, '');

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
 * Generate optimized image variants (thumbnail, medium, large)
 * Note: For production, consider using Cloudflare Image Resizing or a separate image processing service
 */
export interface ImageVariants {
  original: string;
  thumbnail?: string;
  medium?: string;
  large?: string;
}
