import type { APIRoute } from 'astro';
import { pool } from '../../../../lib/db';

/**
 * GET /api/admin/products/[id]
 * Fetch a product by ID for editing
 */
export const GET: APIRoute = async ({ params, locals }) => {
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

    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Product ID is required' },
        }),
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Fetch product
      const productResult = await client.query(
        'SELECT * FROM products WHERE id = $1',
        [id]
      );

      if (productResult.rows.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: 'Product not found' },
          }),
          { status: 404 }
        );
      }

      const product = productResult.rows[0];

      // Fetch price tiers
      const tiersResult = await client.query(
        'SELECT * FROM "priceTiers" WHERE "productId" = $1 ORDER BY "displayOrder"',
        [id]
      );

      const productWithTiers = {
        ...product,
        basePrice: parseFloat(product.basePrice),
        compareAtPrice: product.compareAtPrice ? parseFloat(product.compareAtPrice) : null,
        priceTiers: tiersResult.rows.map(t => ({
          ...t,
          pricePerUnit: parseFloat(t.pricePerUnit),
          discountPercent: parseFloat(t.discountPercent),
        })),
      };

      return new Response(
        JSON.stringify({
          success: true,
          data: productWithTiers,
        }),
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching product:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error.message || 'Failed to fetch product',
        },
      }),
      { status: 500 }
    );
  }
};

/**
 * PUT /api/admin/products/[id]
 * Update a product
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
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

    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Product ID is required' },
        }),
        { status: 400 }
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

      // Check if slug is already used by another product
      const existingSlug = await client.query(
        'SELECT id FROM products WHERE slug = $1 AND id != $2',
        [data.slug, id]
      );

      if (existingSlug.rows.length > 0) {
        throw new Error('A product with this slug already exists');
      }

      // Update product
      await client.query(`
        UPDATE products SET
          "categoryId" = $1,
          slug = $2,
          name = $3,
          "shortDescription" = $4,
          description = $5,
          "basePrice" = $6,
          "compareAtPrice" = $7,
          sku = $8,
          "trackInventory" = $9,
          "requiresShipping" = $10,
          "isActive" = $11,
          "isFeatured" = $12,
          "maxWidthMm" = $13,
          "minHeightMm" = $14,
          "maxHeightMm" = $15,
          "acceptsFileUpload" = $16,
          "maxFileSizeMb" = $17,
          "allowedFileTypes" = $18,
          "priceCalculationMethod" = $19,
          "isBlockout" = $20,
          "printTechnology" = $21,
          "metaTitle" = $22,
          "metaDescription" = $23,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $24
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
        data.requiresShipping !== false,
        data.isActive !== false,
        data.isFeatured || false,
        data.maxWidthMm || null,
        data.minHeightMm || null,
        data.maxHeightMm || null,
        data.acceptsFileUpload || false,
        data.maxFileSizeMb || 255,
        data.allowedFileTypes || 'PDF',
        data.priceCalculationMethod || 'per_piece',
        data.isBlockout || false,
        data.printTechnology || 'DTF',
        data.metaTitle || null,
        data.metaDescription || null,
        id
      ]);

      // Delete existing price tiers
      await client.query('DELETE FROM "priceTiers" WHERE "productId" = $1', [id]);

      // Insert new price tiers if provided
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
            id,
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
          data: { productId: id },
        }),
        { status: 200 }
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating product:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error.message || 'Failed to update product',
        },
      }),
      { status: 500 }
    );
  }
};

/**
 * PATCH /api/admin/products/[id]
 * Update specific product fields (e.g., set primary image)
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
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

    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Product ID is required' },
        }),
        { status: 400 }
      );
    }

    const data = await request.json();

    const client = await pool.connect();

    try {
      // Handle setting primary image
      if (data.primaryImageId) {
        await client.query('BEGIN');

        // Unset all primary images for this product
        await client.query(
          'UPDATE "productImages" SET "isPrimary" = false WHERE "productId" = $1',
          [id]
        );

        // Set the new primary image
        await client.query(
          'UPDATE "productImages" SET "isPrimary" = true WHERE id = $1 AND "productId" = $2',
          [data.primaryImageId, id]
        );

        await client.query('COMMIT');
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Product updated successfully',
        }),
        { status: 200 }
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating product:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update product',
        },
      }),
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/admin/products/[id]
 * Delete a product (soft delete by setting isActive to false)
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
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

    const { id } = params;
    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Product ID is required' },
        }),
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Soft delete by setting isActive to false
      const result = await client.query(
        'UPDATE products SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: 'Product not found' },
          }),
          { status: 404 }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Product deactivated successfully',
        }),
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting product:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error.message || 'Failed to delete product',
        },
      }),
      { status: 500 }
    );
  }
};
