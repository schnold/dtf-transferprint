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

    // Validate numeric values to prevent exploits
    if (basePrice !== null && basePrice !== undefined) {
      const parsedBasePrice = parseFloat(basePrice);
      if (isNaN(parsedBasePrice) || parsedBasePrice < 0 || parsedBasePrice > 999999.99) {
        return new Response(JSON.stringify({
          success: false,
          error: { message: 'Base price must be a valid positive number (max 999999.99)' }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (freeShippingThreshold !== null && freeShippingThreshold !== undefined) {
      const parsedThreshold = parseFloat(freeShippingThreshold);
      if (isNaN(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 999999.99) {
        return new Response(JSON.stringify({
          success: false,
          error: { message: 'Free shipping threshold must be a valid positive number (max 999999.99)' }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (estimatedDays !== null && estimatedDays !== undefined) {
      const parsedDays = parseInt(estimatedDays);
      if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365) {
        return new Response(JSON.stringify({
          success: false,
          error: { message: 'Estimated days must be a valid number between 1 and 365' }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (displayOrder !== null && displayOrder !== undefined) {
      const parsedOrder = parseInt(displayOrder);
      if (isNaN(parsedOrder) || parsedOrder < 0 || parsedOrder > 9999) {
        return new Response(JSON.stringify({
          success: false,
          error: { message: 'Display order must be a valid number between 0 and 9999' }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

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
      await client.query('BEGIN');

      // Check if profile exists
      const checkResult = await client.query('SELECT "isDefault" FROM "shippingProfiles" WHERE id = $1', [id]);

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return new Response(JSON.stringify({ success: false, error: { message: 'Profile not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Ensure at least one profile will remain after deletion
      const countResult = await client.query('SELECT COUNT(*) as count FROM "shippingProfiles"');
      const profileCount = parseInt(countResult.rows[0].count);

      if (profileCount <= 1) {
        await client.query('ROLLBACK');
        return new Response(JSON.stringify({
          success: false,
          error: { message: 'Cannot delete the last shipping profile. At least one profile must exist.' }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const isDefault = checkResult.rows[0].isDefault;

      // Delete the profile
      await client.query('DELETE FROM "shippingProfiles" WHERE id = $1', [id]);

      // If we deleted the default profile, set another profile as default
      if (isDefault) {
        await client.query(`
          UPDATE "shippingProfiles"
          SET "isDefault" = true
          WHERE id = (
            SELECT id FROM "shippingProfiles"
            WHERE "isActive" = true
            ORDER BY "displayOrder" ASC, "createdAt" ASC
            LIMIT 1
          )
        `);
      }

      await client.query('COMMIT');

      return new Response(JSON.stringify({ success: true }), {
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
