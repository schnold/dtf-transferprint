import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';

/**
 * POST /api/cart/update-services
 * Updates the zusatzleistungen for a cart item.
 * SECURITY: Prices are always fetched from the database — client-provided
 * prices are never trusted. Only services that are active and explicitly
 * enabled for the product can be added.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  const userId = user?.id;

  if (!userId) {
    return new Response(
      JSON.stringify({ success: false, error: { message: 'Unauthorized' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const client = await pool.connect();

  try {
    const body = await request.json();
    const { cartItemId, zusatzleistungIds } = body;

    if (!cartItemId || typeof cartItemId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'Cart item ID is required' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(zusatzleistungIds)) {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'Invalid request format' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate all IDs are strings to prevent injection
    if (zusatzleistungIds.some((id) => typeof id !== 'string')) {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'Invalid service ID format' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify cart item belongs to this user and get the product ID
    const cartItemResult = await client.query(
      'SELECT id, "productId", "unitPrice", quantity FROM "cartItems" WHERE id = $1 AND "userId" = $2',
      [cartItemId, userId]
    );

    if (cartItemResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'Cart item not found' } }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cartItem = cartItemResult.rows[0];
    const productId = cartItem.productId;

    await client.query('BEGIN');

    // Remove all existing services for this cart item
    await client.query('DELETE FROM "cartItemZusatzleistungen" WHERE "cartItemId" = $1', [cartItemId]);

    // If services are selected, validate them and insert with DB prices
    if (zusatzleistungIds.length > 0) {
      // SECURITY: Only insert services that are:
      //   1. In the provided list
      //   2. Active in the global zusatzleistungen table
      //   3. Explicitly enabled for this specific product
      // Prices come exclusively from the database.
      const validServicesResult = await client.query(
        `SELECT z.id, z.price
         FROM "zusatzleistungen" z
         INNER JOIN "productZusatzleistungen" pz ON z.id = pz."zusatzleistungId"
         WHERE z.id = ANY($1::text[])
           AND z."isActive" = true
           AND pz."productId" = $2
           AND pz."isEnabled" = true`,
        [zusatzleistungIds, productId]
      );

      for (const service of validServicesResult.rows) {
        await client.query(
          `INSERT INTO "cartItemZusatzleistungen" (id, "cartItemId", "zusatzleistungId", price)
           VALUES (gen_random_uuid()::text, $1, $2, $3)`,
          [cartItemId, service.id, service.price]
        );
      }
    }

    await client.query('COMMIT');

    // Recalculate totals
    const servicesTotalResult = await client.query(
      'SELECT COALESCE(SUM(price), 0) as total FROM "cartItemZusatzleistungen" WHERE "cartItemId" = $1',
      [cartItemId]
    );
    const servicesTotal = parseFloat(servicesTotalResult.rows[0].total);
    const itemTotal = parseFloat(cartItem.unitPrice) * cartItem.quantity + servicesTotal;

    // Recalculate the full cart subtotal
    const subtotalResult = await client.query(
      `SELECT
         ci.quantity,
         ci."unitPrice",
         COALESCE(SUM(ciz.price), 0) as "servicesTotal"
       FROM "cartItems" ci
       LEFT JOIN "cartItemZusatzleistungen" ciz ON ci.id = ciz."cartItemId"
       WHERE ci."userId" = $1
       GROUP BY ci.id, ci.quantity, ci."unitPrice"`,
      [userId]
    );

    const newSubtotal = subtotalResult.rows.reduce(
      (sum, row) => sum + parseFloat(row.unitPrice) * row.quantity + parseFloat(row.servicesTotal),
      0
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          cartItemId,
          itemTotal,
          servicesTotal,
          newSubtotal,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating cart services:', error);
    return new Response(
      JSON.stringify({ success: false, error: { message: 'Failed to update services' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    client.release();
  }
};
