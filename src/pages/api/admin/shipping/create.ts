import type { APIRoute } from 'astro';
import { pool } from '../../../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;

  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Unauthorized' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    const {
      name,
      description,
      basePrice,
      freeShippingThreshold,
      estimatedDays,
      isActive = true,
      isDefault = false,
      displayOrder = 0
    } = data;

    if (!name || basePrice === undefined || basePrice === null) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Name and base price are required' }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If this is set as default, unset other defaults
      if (isDefault) {
        await client.query('UPDATE "shippingProfiles" SET "isDefault" = false WHERE "isDefault" = true');
      }

      const result = await client.query(`
        INSERT INTO "shippingProfiles" (
          id, name, description, "basePrice", "freeShippingThreshold",
          "estimatedDays", "isActive", "isDefault", "displayOrder"
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8
        ) RETURNING *
      `, [
        name,
        description || null,
        basePrice,
        freeShippingThreshold || null,
        estimatedDays || null,
        isActive,
        isDefault,
        displayOrder
      ]);

      await client.query('COMMIT');

      return new Response(JSON.stringify({
        success: true,
        data: {
          ...result.rows[0],
          basePrice: parseFloat(result.rows[0].basePrice),
          freeShippingThreshold: result.rows[0].freeShippingThreshold ? parseFloat(result.rows[0].freeShippingThreshold) : null,
        }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating shipping profile:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to create shipping profile' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
