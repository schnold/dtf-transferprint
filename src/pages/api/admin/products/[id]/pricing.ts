import type { APIRoute } from 'astro';
import { pool } from '@/lib/db';

/**
 * PUT /api/admin/products/[id]/pricing
 * Update only pricing-related fields (basePrice, compareAtPrice, priceCalculationMethod, priceTiers)
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    // Check if user is admin - use locals.user directly (set by middleware)
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

    // Validate that basePrice is provided
    if (!data.basePrice || isNaN(parseFloat(data.basePrice))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'basePrice is required and must be a valid number' },
        }),
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update only pricing-related fields
      await client.query(`
        UPDATE products SET
          "basePrice" = $1,
          "compareAtPrice" = $2,
          "priceCalculationMethod" = $3,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [
        parseFloat(data.basePrice),
        data.compareAtPrice ? parseFloat(data.compareAtPrice) : null,
        data.priceCalculationMethod || 'per_piece',
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
    console.error('Error updating product pricing:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update product pricing',
        },
      }),
      { status: 500 }
    );
  }
};
