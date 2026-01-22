import type { APIRoute } from 'astro';
import { pool } from '../../../../../lib/db';

/**
 * DELETE /api/admin/products/[id]/hard-delete
 * Permanently delete a product from the database
 * This will also cascade delete related records (images, reviews, etc.)
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
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

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete related records first (if not using CASCADE in database)
      // Note: If your database has CASCADE DELETE set up, these may not be necessary

      // Delete product images
      await client.query('DELETE FROM "productImages" WHERE "productId" = $1', [id]);

      // Delete price tiers
      await client.query('DELETE FROM "priceTiers" WHERE "productId" = $1', [id]);

      // Delete product specifications
      await client.query('DELETE FROM "productSpecifications" WHERE "productId" = $1', [id]);

      // Delete product reviews
      await client.query('DELETE FROM "productReviews" WHERE "productId" = $1', [id]);

      // Delete related products associations
      await client.query('DELETE FROM "relatedProducts" WHERE "productId" = $1 OR "relatedProductId" = $1', [id]);

      // Delete cart items containing this product
      await client.query('DELETE FROM "cartItems" WHERE "productId" = $1', [id]);

      // Delete order items (you might want to keep these for historical records)
      // Commenting this out - usually you want to preserve order history
      // await client.query('DELETE FROM "orderItems" WHERE "productId" = $1', [id]);

      // Finally, delete the product itself
      const result = await client.query(
        'DELETE FROM products WHERE id = $1 RETURNING id, name',
        [id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: 'Product not found' },
          }),
          { status: 404 }
        );
      }

      await client.query('COMMIT');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Product permanently deleted',
          data: {
            deletedProduct: result.rows[0]
          }
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
    console.error('Error permanently deleting product:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to permanently delete product',
        },
      }),
      { status: 500 }
    );
  }
};
