import type { APIRoute } from 'astro';
import { uploadToR2, validateDesignFile } from '../../../../lib/r2';
import { pool } from '../../../../lib/db';

/**
 * POST /api/admin/products/upload-file
 * Upload product design files to R2 and save to database
 */
export const POST: APIRoute = async ({ request, locals }) => {
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

    const formData = await request.formData();
    const productId = formData.get('productId') as string;
    const files = formData.getAll('files') as File[];
    const isPublic = formData.get('isPublic') === 'true';

    if (!productId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Product ID is required' },
        }),
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'No files provided' },
        }),
        { status: 400 }
      );
    }

    const client = await pool.connect();
    const uploadedFiles: Array<{ url: string; id: string; fileName: string }> = [];

    try {
      await client.query('BEGIN');

      // Verify product exists
      const productCheck = await client.query(
        'SELECT id FROM products WHERE id = $1',
        [productId]
      );

      if (productCheck.rows.length === 0) {
        throw new Error('Product not found');
      }

      // Get current max display order
      const maxOrderResult = await client.query(
        'SELECT COALESCE(MAX("displayOrder"), 0) as "maxOrder" FROM "productFiles" WHERE "productId" = $1',
        [productId]
      );
      let displayOrder = parseInt(maxOrderResult.rows[0].maxOrder) + 1;

      // Process each file
      for (const file of files) {
        if (file.size === 0) continue; // Skip empty files

        // Validate file
        const validation = validateDesignFile(
          { size: file.size, type: file.type, name: file.name },
          255
        );
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to R2
        const fileUrl = await uploadToR2(buffer, file.name, file.type);

        // Save to database
        const fileResult = await client.query(
          `INSERT INTO "productFiles" (
            id, "productId", "fileName", "originalFileName", "fileUrl",
            "fileSize", "mimeType", "uploadedBy", "isPublic", "displayOrder"
          ) VALUES (
            gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9
          ) RETURNING id, "fileUrl", "fileName"`,
          [
            productId,
            file.name,
            file.name,
            fileUrl,
            file.size,
            file.type,
            user.id,
            isPublic,
            displayOrder++,
          ]
        );

        uploadedFiles.push({
          id: fileResult.rows[0].id,
          url: fileResult.rows[0].fileUrl,
          fileName: fileResult.rows[0].fileName,
        });
      }

      await client.query('COMMIT');

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            files: uploadedFiles,
            message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
          },
        }),
        { status: 201 }
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error uploading files:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to upload files',
        },
      }),
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/admin/products/upload-file
 * Delete a product file from R2 and database
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
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

    const { fileId } = await request.json();

    if (!fileId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'File ID is required' },
        }),
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Get file URL before deleting
      const fileResult = await client.query(
        'SELECT "fileUrl" FROM "productFiles" WHERE id = $1',
        [fileId]
      );

      if (fileResult.rows.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: 'File not found' },
          }),
          { status: 404 }
        );
      }

      // Delete from database
      await client.query('DELETE FROM "productFiles" WHERE id = $1', [fileId]);

      // Note: We keep the file in R2 for now to prevent breaking links
      // In production, you might want to implement a cleanup job
      // deleteFromR2(fileUrl);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'File deleted successfully',
        }),
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting file:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to delete file',
        },
      }),
      { status: 500 }
    );
  }
};
