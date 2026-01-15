import type { APIRoute } from 'astro';
import { pool } from '../../../../lib/db';

// GET - Get all zusatzleistungen
export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;

  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Unauthorized' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM "zusatzleistungen"
        ORDER BY "displayOrder" ASC, "createdAt" ASC
      `);

      return new Response(JSON.stringify({
        success: true,
        data: result.rows.map(row => ({
          ...row,
          price: parseFloat(row.price),
        }))
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching zusatzleistungen:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to fetch zusatzleistungen' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Create new zusatzleistung
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
      price,
      isActive = true,
      displayOrder = 0
    } = data;

    // Validation
    if (!name || !name.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Name is required' }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (price === undefined || price === null || price < 0) {
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
        INSERT INTO "zusatzleistungen" (
          id, name, description, price, "isActive", "displayOrder"
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4, $5
        ) RETURNING *
      `, [
        name.trim(),
        description ? description.trim() : null,
        price,
        isActive,
        displayOrder
      ]);

      return new Response(JSON.stringify({
        success: true,
        data: {
          ...result.rows[0],
          price: parseFloat(result.rows[0].price),
        }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating zusatzleistung:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to create zusatzleistung' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
