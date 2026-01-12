import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';

/**
 * DELETE /api/cart/remove
 * Remove an item from the cart
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
  const client = await pool.connect();

  try {
    const user = locals.user;
    const userId = user?.id;

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Unauthorized - Please log in' },
        }),
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cartItemId } = body;

    if (!cartItemId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Cart item ID is required' },
        }),
        { status: 400 }
      );
    }

    // Verify cart item belongs to user before deleting
    const verifyResult = await client.query(
      'SELECT id FROM "cartItems" WHERE id = $1 AND "userId" = $2',
      [cartItemId, userId]
    );

    if (verifyResult.rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Cart item not found' },
        }),
        { status: 404 }
      );
    }

    // Delete the cart item
    await client.query('DELETE FROM "cartItems" WHERE id = $1', [cartItemId]);

    // Get updated cart count
    const cartCountResult = await client.query(
      'SELECT COUNT(id) as count FROM "cartItems" WHERE "userId" = $1',
      [userId]
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          cartCount: parseInt(cartCountResult.rows[0].count),
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing from cart:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to remove item from cart',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500 }
    );
  } finally {
    client.release();
  }
};
