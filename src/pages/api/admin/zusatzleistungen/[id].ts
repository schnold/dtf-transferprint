import type { APIRoute } from 'astro';
import { pool } from '../../../../lib/db';

// GET - Get single zusatzleistung
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
    return new Response(JSON.stringify({ success: false, error: { message: 'Service ID is required' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM "zusatzleistungen" WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ success: false, error: { message: 'Service not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          ...result.rows[0],
          price: parseFloat(result.rows[0].price),
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching zusatzleistung:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to fetch zusatzleistung' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update zusatzleistung
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
    return new Response(JSON.stringify({ success: false, error: { message: 'Service ID is required' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    const {
      name,
      description,
      price,
      isActive,
      displayOrder
    } = data;

    // Validation
    if (name !== undefined && (!name || !name.trim())) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Name cannot be empty' }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (price !== undefined && (price === null || price < 0)) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Price must be a positive number' }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE "zusatzleistungen"
        SET
          name = COALESCE($1, name),
          description = $2,
          price = COALESCE($3, price),
          "isActive" = COALESCE($4, "isActive"),
          "displayOrder" = COALESCE($5, "displayOrder"),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [
        name ? name.trim() : null,
        description !== undefined ? (description ? description.trim() : null) : undefined,
        price,
        isActive,
        displayOrder,
        id
      ]);

      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ success: false, error: { message: 'Service not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          ...result.rows[0],
          price: parseFloat(result.rows[0].price),
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating zusatzleistung:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to update zusatzleistung' }
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
    return new Response(JSON.stringify({ success: false, error: { message: 'Service ID is required' } }), {
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
        UPDATE "zusatzleistungen"
        SET "isActive" = $1, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [isActive, id]);

      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ success: false, error: { message: 'Service not found' } }), {
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
    console.error('Error updating zusatzleistung status:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to update zusatzleistung status' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Delete zusatzleistung (soft delete recommended by checking usage first)
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
    return new Response(JSON.stringify({ success: false, error: { message: 'Service ID is required' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await pool.connect();
    try {
      // Check if zusatzleistung exists
      const checkResult = await client.query('SELECT id FROM "zusatzleistungen" WHERE id = $1', [id]);

      if (checkResult.rows.length === 0) {
        return new Response(JSON.stringify({ success: false, error: { message: 'Service not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if zusatzleistung is used in any active carts
      const cartUsageResult = await client.query(`
        SELECT COUNT(*) as count
        FROM "cartItemZusatzleistungen"
        WHERE "zusatzleistungId" = $1
      `, [id]);

      const cartUsageCount = parseInt(cartUsageResult.rows[0].count);

      if (cartUsageCount > 0) {
        return new Response(JSON.stringify({
          success: false,
          error: {
            message: `Cannot delete service: it is currently in ${cartUsageCount} active cart(s). Please deactivate it instead.`
          }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Safe to delete
      await client.query('DELETE FROM "zusatzleistungen" WHERE id = $1', [id]);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting zusatzleistung:', error);

    // Check if it's a foreign key constraint error
    if ((error as any).code === '23503') {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Cannot delete service: it is still referenced by cart items or product associations' }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to delete zusatzleistung' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
