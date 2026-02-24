import type { APIRoute } from 'astro';
import { pool } from '../../../../lib/db';

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

    const data = await request.json();

    // Validate required fields
    const required = ['name', 'slug', 'categoryId', 'shortDescription', 'description', 'basePrice'];
    for (const field of required) {
      if (!data[field]) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: `Missing required field: ${field}` },
          }),
          { status: 400 }
        );
      }
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if slug already exists
      const existingSlug = await client.query(
        'SELECT id FROM products WHERE slug = $1',
        [data.slug]
      );

      if (existingSlug.rows.length > 0) {
        throw new Error('A product with this slug already exists');
      }

      // Insert product
      const productResult = await client.query(`
        INSERT INTO products (
          id,
          "categoryId",
          slug,
          name,
          "shortDescription",
          description,
          "basePrice",
          "compareAtPrice",
          sku,
          "trackInventory",
          "inventoryQuantity",
          "inventoryPolicy",
          "requiresShipping",
          "isActive",
          "isFeatured",
          "maxWidthMm",
          "minHeightMm",
          "maxHeightMm",
          "acceptsFileUpload",
          "requiresInquiry",
          "maxFileSizeMb",
          "allowedFileTypes",
          "priceCalculationMethod",
          "isBlockout",
          "printTechnology",
          "metaTitle",
          "metaDescription"
        ) VALUES (
          gen_random_uuid()::text,
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
        ) RETURNING id
      `, [
        data.categoryId,
        data.slug,
        data.name,
        data.shortDescription,
        data.description,
        data.basePrice,
        data.compareAtPrice || null,
        data.sku || null,
        data.trackInventory || false,
        0, // initial inventory
        'continue',
        data.requiresShipping !== false,
        data.isActive !== false,
        data.isFeatured || false,
        data.maxWidthMm || null,
        data.minHeightMm || null,
        data.maxHeightMm || null,
        data.acceptsFileUpload || false,
        data.requiresInquiry || false,
        data.maxFileSizeMb || 255,
        data.allowedFileTypes || 'PDF',
        data.priceCalculationMethod || 'per_piece',
        data.isBlockout || false,
        data.printTechnology || 'DTF',
        data.metaTitle || null,
        data.metaDescription || null,
      ]);

      const productId = productResult.rows[0].id;

      // Insert price tiers if provided
      if (data.priceTiers && data.priceTiers.length > 0) {
        for (const tier of data.priceTiers) {
          await client.query(`
            INSERT INTO "priceTiers" (
              id,
              "productId",
              "minQuantity",
              "maxQuantity",
              "discountPercent",
              "pricePerUnit",
              "displayOrder"
            ) VALUES (
              gen_random_uuid()::text,
              $1, $2, $3, $4, $5, $6
            )
          `, [
            productId,
            tier.minQuantity,
            tier.maxQuantity || null,
            tier.discountPercent,
            tier.pricePerUnit,
            tier.displayOrder
          ]);
        }
      }

      await client.query('COMMIT');

      return new Response(
        JSON.stringify({
          success: true,
          data: { productId },
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
    console.error('Error creating product:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error.message || 'Failed to create product',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      }),
      { status: 500 }
    );
  }
};
