import type { APIRoute } from 'astro';
import { pool } from '../../../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Unauthorized' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    const { shippingProfileId } = data;

    if (!shippingProfileId) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Shipping profile ID is required' }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const client = await pool.connect();
    try {
      // Verify the shipping profile exists and is active
      const profileCheck = await client.query(
        'SELECT id FROM "shippingProfiles" WHERE id = $1 AND "isActive" = true',
        [shippingProfileId]
      );

      if (profileCheck.rows.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: { message: 'Invalid shipping profile' }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Upsert the user's shipping selection
      await client.query(`
        INSERT INTO "userCartShipping" (id, "userId", "shippingProfileId")
        VALUES (gen_random_uuid()::text, $1, $2)
        ON CONFLICT ("userId")
        DO UPDATE SET "shippingProfileId" = $2, "selectedAt" = CURRENT_TIMESTAMP
      `, [user.id, shippingProfileId]);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error selecting shipping profile:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to select shipping profile' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET - Get user's selected shipping profile
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;

  if (!user) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Unauthorized' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT
          sp.id, sp.name, sp.description, sp."basePrice",
          sp."freeShippingThreshold", sp."estimatedDays", sp."isDefault"
        FROM "userCartShipping" ucs
        JOIN "shippingProfiles" sp ON ucs."shippingProfileId" = sp.id
        WHERE ucs."userId" = $1 AND sp."isActive" = true
      `, [user.id]);

      if (result.rows.length === 0) {
        // Return default shipping profile
        const defaultResult = await client.query(`
          SELECT id, name, description, "basePrice", "freeShippingThreshold", "estimatedDays", "isDefault"
          FROM "shippingProfiles"
          WHERE "isDefault" = true AND "isActive" = true
          LIMIT 1
        `);

        if (defaultResult.rows.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: { message: 'No default shipping profile found' }
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({
          success: true,
          data: {
            ...defaultResult.rows[0],
            basePrice: parseFloat(defaultResult.rows[0].basePrice),
            freeShippingThreshold: defaultResult.rows[0].freeShippingThreshold ? parseFloat(defaultResult.rows[0].freeShippingThreshold) : null,
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          ...result.rows[0],
          basePrice: parseFloat(result.rows[0].basePrice),
          freeShippingThreshold: result.rows[0].freeShippingThreshold ? parseFloat(result.rows[0].freeShippingThreshold) : null,
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching user shipping profile:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to fetch shipping profile' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
