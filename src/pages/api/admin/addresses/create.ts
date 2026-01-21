import type { APIRoute } from 'astro';
import { pool } from '../../../../lib/db';

/**
 * POST /api/admin/addresses/create
 * Admin endpoint to create an address for any user
 */
export const POST: APIRoute = async ({ request, locals }) => {
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
    const {
      userId,
      addressType,
      isDefault,
      firstName,
      lastName,
      company,
      addressLine1,
      addressLine2,
      city,
      stateProvince,
      postalCode,
      country,
      phone,
    } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'User ID is required' },
        }),
        { status: 400 }
      );
    }

    // Validation
    if (!firstName || !lastName || !addressLine1 || !city || !postalCode || !country) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Required fields missing' },
        }),
        { status: 400 }
      );
    }

    // Verify user exists
    const userCheck = await client.query(
      'SELECT id FROM "user" WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'User not found' },
        }),
        { status: 404 }
      );
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await client.query(
        `UPDATE "userAddresses" SET "isDefault" = false WHERE "userId" = $1 AND "addressType" = $2`,
        [userId, addressType || 'both']
      );
    }

    const result = await client.query(
      `
      INSERT INTO "userAddresses" (
        id, "userId", "addressType", "isDefault", "firstName", "lastName",
        company, "addressLine1", "addressLine2", city, "stateProvince",
        "postalCode", country, phone
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *
    `,
      [
        userId,
        addressType || 'both',
        isDefault || false,
        firstName,
        lastName,
        company || null,
        addressLine1,
        addressLine2 || null,
        city,
        stateProvince || null,
        postalCode,
        country || 'DE',
        phone || null,
      ]
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: { address: result.rows[0] },
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating address:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to create address',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500 }
    );
  } finally {
    client.release();
  }
};
