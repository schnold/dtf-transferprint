import type { APIRoute } from 'astro';
import { pool } from '../../../../../lib/db';

/**
 * POST /api/admin/products/[id]/toggle-active
 * Toggle product activation status (isActive)
 */
export const POST: APIRoute = async ({ params, locals }) => {
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
      // Toggle the isActive status
      const result = await client.query(
        `UPDATE products
         SET "isActive" = NOT "isActive",
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, "isActive"`,
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

      const product = result.rows[0];

      return new Response(
        JSON.stringify({
          success: true,
          message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
          data: {
            isActive: product.isActive
          }
        }),
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error toggling product activation:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to toggle product activation',
        },
      }),
      { status: 500 }
    );
  }
};
