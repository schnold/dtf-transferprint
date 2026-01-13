import type { APIRoute } from 'astro';
import { pool } from '../../../../lib/db';

// GET - Get single shipping profile
export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;

  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Unauthorized' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Profile ID is required' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM "shippingProfiles" WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ success: false, error: { message: 'Profile not found' } }), {
          status: 404,
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
    console.error('Error fetching shipping profile:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to fetch shipping profile' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update shipping profile
export const PUT: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;

  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Unauthorized' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Profile ID is required' } }), {
      status: 400,
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
      isActive,
      isDefault,
      displayOrder
    } = data;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If this is set as default, unset other defaults
      if (isDefault) {
        await client.query('UPDATE "shippingProfiles" SET "isDefault" = false WHERE "isDefault" = true AND id != $1', [id]);
      }

      const result = await client.query(`
        UPDATE "shippingProfiles"
        SET
          name = COALESCE($1, name),
          description = $2,
          "basePrice" = COALESCE($3, "basePrice"),
          "freeShippingThreshold" = $4,
          "estimatedDays" = $5,
          "isActive" = COALESCE($6, "isActive"),
          "isDefault" = COALESCE($7, "isDefault"),
          "displayOrder" = COALESCE($8, "displayOrder"),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING *
      `, [
        name,
        description,
        basePrice,
        freeShippingThreshold,
        estimatedDays,
        isActive,
        isDefault,
        displayOrder,
        id
      ]);

      await client.query('COMMIT');

      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ success: false, error: { message: 'Profile not found' } }), {
          status: 404,
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
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating shipping profile:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to update shipping profile' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PATCH - Partial update (for quick toggles like isActive)
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;

  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Unauthorized' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Profile ID is required' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    const { isActive } = data;

    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE "shippingProfiles"
        SET "isActive" = $1, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [isActive, id]);

      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ success: false, error: { message: 'Profile not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating shipping profile status:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to update shipping profile status' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Delete shipping profile
export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;

  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Unauthorized' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Profile ID is required' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await pool.connect();
    try {
      // Check if profile is default
      const checkResult = await client.query('SELECT "isDefault" FROM "shippingProfiles" WHERE id = $1', [id]);

      if (checkResult.rows.length === 0) {
        return new Response(JSON.stringify({ success: false, error: { message: 'Profile not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (checkResult.rows[0].isDefault) {
        return new Response(JSON.stringify({
          success: false,
          error: { message: 'Cannot delete default shipping profile' }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await client.query('DELETE FROM "shippingProfiles" WHERE id = $1', [id]);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting shipping profile:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to delete shipping profile' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
