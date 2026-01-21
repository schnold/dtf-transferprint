import type { APIRoute } from 'astro';
import { pool } from '../../../../lib/db';

/**
 * PUT /api/admin/addresses/update
 * Admin endpoint to update any user's address
 */
export const PUT: APIRoute = async ({ request, locals }) => {
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
      id,
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

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Address ID is required' },
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

    // Get the address to find userId
    const addressCheck = await client.query(
      'SELECT "userId" FROM "userAddresses" WHERE id = $1',
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

    const userId = addressCheck.rows[0].userId;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await client.query(
        `UPDATE "userAddresses" SET "isDefault" = false WHERE "userId" = $1 AND "addressType" = $2 AND id != $3`,
        [userId, addressType || 'both', id]
      );
    }

    const result = await client.query(
      `
      UPDATE "userAddresses"
      SET
        "addressType" = $2,
        "isDefault" = $3,
        "firstName" = $4,
        "lastName" = $5,
        company = $6,
        "addressLine1" = $7,
        "addressLine2" = $8,
        city = $9,
        "stateProvince" = $10,
        "postalCode" = $11,
        country = $12,
        phone = $13,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `,
      [
        id,
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
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating address:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to update address',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500 }
    );
  } finally {
    client.release();
  }
};
