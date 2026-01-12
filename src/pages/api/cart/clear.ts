import type { APIRoute } from 'astro';
import { clearCart } from '../../../lib/db';

/**
 * DELETE /api/cart/clear
 * Clear all items from the cart
 */
export const DELETE: APIRoute = async ({ locals }) => {
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

    await clearCart(userId);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          cartCount: 0,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error clearing cart:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to clear cart',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500 }
    );
  }
};
