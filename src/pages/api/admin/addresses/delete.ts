import type { APIRoute } from 'astro';
import { pool } from '../../../../lib/db';

/**
 * DELETE /api/admin/addresses/delete
 * Admin endpoint to delete any user's address
 */
export const DELETE: APIRoute = async ({ request, locals }) => {
  const client = await pool.connect();

  try {
    const currentUser = locals.user;

    // Verify admin privileges
    if (!currentUser?.isAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Unauthorized - Admin access required' },
        }),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Address ID is required' },
        }),
        { status: 400 }
      );
    }

    // Verify address exists
    const addressCheck = await client.query(
      'SELECT id FROM "userAddresses" WHERE id = $1',
      [id]
    );

    if (addressCheck.rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Address not found' },
        }),
        { status: 404 }
      );
    }

    // Delete the address
    await client.query(
      'DELETE FROM "userAddresses" WHERE id = $1',
      [id]
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: { message: 'Address deleted successfully' },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting address:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to delete address',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500 }
    );
  } finally {
    client.release();
  }
};
