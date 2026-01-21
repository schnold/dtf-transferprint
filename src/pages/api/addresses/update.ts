import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';

/**
 * PUT /api/addresses/update
 * Update an existing address
 */
export const PUT: APIRoute = async ({ request, locals }) => {
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
