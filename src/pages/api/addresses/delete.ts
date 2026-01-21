import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';

/**
 * DELETE /api/addresses/delete
 * Delete an address
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

    // Verify the address belongs to the user
    const ownerCheck = await client.query(
      'SELECT "userId" FROM "userAddresses" WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Address not found' },
        }),
        { status: 404 }
      );
    }

    if (ownerCheck.rows[0].userId !== userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Unauthorized - This address does not belong to you' },
        }),
        { status: 403 }
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
