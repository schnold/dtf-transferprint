import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';

/**
 * GET /api/addresses/list
 * Get all addresses for the authenticated user
 */
export const GET: APIRoute = async ({ locals }) => {
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

    const result = await client.query(
      `
      SELECT * FROM "userAddresses"
      WHERE "userId" = $1
      ORDER BY "isDefault" DESC, "createdAt" DESC
    `,
      [userId]
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: { addresses: result.rows },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching addresses:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to fetch addresses',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500 }
    );
  } finally {
    client.release();
  }
};
