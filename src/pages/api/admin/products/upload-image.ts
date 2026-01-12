import type { APIRoute } from 'astro';
import { uploadToR2, validateImageFile } from '../../../../lib/r2';
import { pool } from '../../../../lib/db';

/**
 * POST /api/admin/products/upload-image
 * Upload product images to R2 and save to database
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check if user is admin
    const session = locals.session;
    if (!session?.user?.isAdmin) {
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
    const files = formData.getAll('images') as File[];
    const isPrimary = formData.get('isPrimary') === 'true';

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
          error: { message: 'No images provided' },
        }),
        { status: 400 }
      );
    }

    const client = await pool.connect();
    const uploadedImages: Array<{ url: string; id: string }> = [];

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

      // If this is primary, unset other primary images
      if (isPrimary) {
        await client.query(
          'UPDATE "productImages" SET "isPrimary" = false WHERE "productId" = $1',
          [productId]
        );
      }

      // Get current max display order
      const maxOrderResult = await client.query(
        'SELECT COALESCE(MAX("displayOrder"), 0) as "maxOrder" FROM "productImages" WHERE "productId" = $1',
        [productId]
      );
      let displayOrder = parseInt(maxOrderResult.rows[0].maxOrder) + 1;

      // Process each file
      for (const file of files) {
        if (file.size === 0) continue; // Skip empty files

        // Validate file
        const validation = validateImageFile({ size: file.size, type: file.type }, 10);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to R2
        const imageUrl = await uploadToR2(buffer, file.name, file.type);

        // Save to database
        const imageResult = await client.query(
          `INSERT INTO "productImages" (
            id, "productId", url, "altText", "isPrimary", "displayOrder"
          ) VALUES (
            gen_random_uuid()::text, $1, $2, $3, $4, $5
          ) RETURNING id, url`,
          [
            productId,
            imageUrl,
            file.name.replace(/\.[^/.]+$/, ''), // Remove extension for alt text
            isPrimary && uploadedImages.length === 0, // Only first image is primary if flag is set
            displayOrder++,
          ]
        );

        uploadedImages.push({
          id: imageResult.rows[0].id,
          url: imageResult.rows[0].url,
        });
      }

      await client.query('COMMIT');

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            images: uploadedImages,
            message: `Successfully uploaded ${uploadedImages.length} image(s)`,
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
    console.error('Error uploading images:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to upload images',
        },
      }),
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/admin/products/upload-image
 * Delete a product image from R2 and database
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const session = locals.session;
    if (!session?.user?.isAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Unauthorized - Admin access required' },
        }),
        { status: 403 }
      );
    }

    const { imageId } = await request.json();

    if (!imageId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Image ID is required' },
        }),
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Get image URL before deleting
      const imageResult = await client.query(
        'SELECT url FROM "productImages" WHERE id = $1',
        [imageId]
      );

      if (imageResult.rows.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: 'Image not found' },
          }),
          { status: 404 }
        );
      }

      const imageUrl = imageResult.rows[0].url;

      // Delete from database
      await client.query('DELETE FROM "productImages" WHERE id = $1', [imageId]);

      // Note: We keep the file in R2 for now to prevent breaking links
      // In production, you might want to implement a cleanup job
      // deleteFromR2(imageUrl);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Image deleted successfully',
        }),
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting image:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to delete image',
        },
      }),
      { status: 500 }
    );
  }
};
