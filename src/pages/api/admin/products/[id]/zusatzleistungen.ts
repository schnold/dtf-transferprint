import type { APIRoute } from 'astro';
import { pool } from '../../../../../lib/db';

// GET - Get all zusatzleistungen with enabled status for a product
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
    return new Response(JSON.stringify({ success: false, error: { message: 'Product ID is required' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await pool.connect();
    try {
      // Verify product exists
      const productResult = await client.query('SELECT id FROM "products" WHERE id = $1', [id]);

      if (productResult.rows.length === 0) {
        return new Response(JSON.stringify({ success: false, error: { message: 'Product not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get all zusatzleistungen with their enabled status for this product
      const result = await client.query(`
        SELECT
          z.id,
          z.name,
          z.description,
          z.price,
          z."isActive",
          z."displayOrder",
          COALESCE(pz."isEnabled", false) as "isEnabledForProduct"
        FROM "zusatzleistungen" z
        LEFT JOIN "productZusatzleistungen" pz
          ON z.id = pz."zusatzleistungId" AND pz."productId" = $1
        ORDER BY z."displayOrder" ASC, z."createdAt" ASC
      `, [id]);

      return new Response(JSON.stringify({
        success: true,
        data: {
          productId: id,
          availableServices: result.rows.map(row => ({
            ...row,
            price: parseFloat(row.price),
          }))
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching product zusatzleistungen:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to fetch product zusatzleistungen' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update enabled zusatzleistungen for a product
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
    return new Response(JSON.stringify({ success: false, error: { message: 'Product ID is required' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const data = await request.json();
    const { zusatzleistungIds } = data;

    if (!Array.isArray(zusatzleistungIds)) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'zusatzleistungIds must be an array' }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify product exists
      const productResult = await client.query('SELECT id FROM "products" WHERE id = $1', [id]);

      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return new Response(JSON.stringify({ success: false, error: { message: 'Product not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Delete all existing associations for this product
      await client.query('DELETE FROM "productZusatzleistungen" WHERE "productId" = $1', [id]);

      // Insert new associations for enabled services
      if (zusatzleistungIds.length > 0) {
        // Verify all zusatzleistung IDs exist and are active
        const verifyResult = await client.query(`
          SELECT id FROM "zusatzleistungen"
          WHERE id = ANY($1::text[])
        `, [zusatzleistungIds]);

        const validIds = verifyResult.rows.map(row => row.id);

        // Only insert valid IDs
        for (const zusatzleistungId of validIds) {
          await client.query(`
            INSERT INTO "productZusatzleistungen" (id, "productId", "zusatzleistungId", "isEnabled")
            VALUES (gen_random_uuid()::text, $1, $2, true)
            ON CONFLICT ("productId", "zusatzleistungId") DO UPDATE
            SET "isEnabled" = true
          `, [id, zusatzleistungId]);
        }
      }

      await client.query('COMMIT');

      // Fetch updated associations to return
      const updatedResult = await client.query(`
        SELECT
          z.id,
          z.name,
          z.price,
          pz."isEnabled" as "isEnabledForProduct"
        FROM "zusatzleistungen" z
        JOIN "productZusatzleistungen" pz
          ON z.id = pz."zusatzleistungId" AND pz."productId" = $1
        WHERE pz."isEnabled" = true
        ORDER BY z."displayOrder" ASC
      `, [id]);

      return new Response(JSON.stringify({
        success: true,
        data: {
          productId: id,
          enabledServices: updatedResult.rows.map(row => ({
            ...row,
            price: parseFloat(row.price),
          }))
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
    console.error('Error updating product zusatzleistungen:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to update product zusatzleistungen' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
