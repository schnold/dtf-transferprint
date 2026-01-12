import type { APIRoute } from 'astro';
import { uploadToR2 } from '../../../lib/r2';
import { extractFileMetadata, validateDesignFileWithRequirements } from '../../../lib/file-metadata';
import { pool } from '../../../lib/db';

/**
 * POST /api/upload/design-file
 * Upload customer design file (PDF or PNG) to R2 storage
 * This creates a temporary upload for cart items - files are permanently associated with orders upon checkout
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const client = await pool.connect();

  try {
    const user = locals.user;
    const userId = user?.id;

    // Check authentication
    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Unauthorized - Please log in to upload files' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const productId = formData.get('productId') as string;

    if (!file) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'No file provided' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get product requirements if productId provided
    let requirements = {
      requiredDpi: 300,
      requiredMinWidth: undefined as number | undefined,
      requiredMinHeight: undefined as number | undefined,
      allowedFileTypes: 'pdf,png',
    };

    if (productId) {
      const productResult = await client.query(
        `SELECT "requiredDpi", "requiredMinWidth", "requiredMinHeight", "allowedFileTypes"
         FROM products WHERE id = $1`,
        [productId]
      );

      if (productResult.rows.length > 0) {
        const product = productResult.rows[0];
        requirements = {
          requiredDpi: product.requiredDpi || 300,
          requiredMinWidth: product.requiredMinWidth,
          requiredMinHeight: product.requiredMinHeight,
          allowedFileTypes: product.allowedFileTypes || 'pdf,png',
        };
      }
    }

    // Validate file type and size
    const validation = validateDesignFileWithRequirements(file, requirements);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: validation.error },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine file type
    const fileName = file.name.toLowerCase();
    let fileType: 'pdf' | 'png';
    if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
      fileType = 'pdf';
    } else if (fileName.endsWith('.png') || file.type === 'image/png') {
      fileType = 'png';
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Unsupported file type' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract file metadata
    const metadata = await extractFileMetadata(buffer, file.name, fileType, requirements);

    // Generate unique filename with user ID prefix for organization
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `design-files/${userId}/${timestamp}-${sanitizedFileName}`;

    // Upload to R2
    const fileUrl = await uploadToR2(buffer, uniqueFileName, file.type);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          fileUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType,
          metadata,
          message: 'Design file uploaded successfully',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error uploading design file:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to upload design file',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    client.release();
  }
};
