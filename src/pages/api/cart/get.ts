import type { APIRoute } from 'astro';
import { getCart } from '../../../lib/db';

/**
 * GET /api/cart/get
 * Get the current user's cart items
 */
export const GET: APIRoute = async ({ locals }) => {
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

    const cartItems = await getCart(userId);

    // Calculate price tier info for each item (including zusatzleistungen)
    const { pool } = await import('../../../lib/db');
    const client = await pool.connect();
    
    try {
      const itemsWithTierInfo = await Promise.all(
        cartItems.map(async (item) => {
          // Get all price tiers for this product
          const tiersResult = await client.query(
            `SELECT * FROM "priceTiers"
             WHERE "productId" = $1
             ORDER BY "minQuantity" ASC`,
            [item.productId]
          );

          const tiers = tiersResult.rows;
          const currentQuantity = item.quantity;
          const unitPrice = item.unitPrice;

          // Get base price
          const productResult = await client.query(
            'SELECT "basePrice" FROM products WHERE id = $1',
            [item.productId]
          );
          const basePrice = productResult.rows[0] ? parseFloat(productResult.rows[0].basePrice) : unitPrice;

          // Calculate current savings
          const currentSavings = (basePrice - unitPrice) * currentQuantity;

          // Find next tier
          const nextTier = tiers.find((t: any) => t.minQuantity > currentQuantity);
          let nextTierInfo = null;

          if (nextTier) {
            const nextTierPrice = parseFloat(nextTier.pricePerUnit);
            const quantityNeeded = nextTier.minQuantity - currentQuantity;
            const savingsAtNextTier = (basePrice - nextTierPrice) * nextTier.minQuantity;
            const additionalSavings = savingsAtNextTier - currentSavings;

            nextTierInfo = {
              minQuantity: nextTier.minQuantity,
              pricePerUnit: nextTierPrice,
              quantityNeeded,
              additionalSavings,
              discountPercent: parseFloat(nextTier.discountPercent || 0),
            };
          }

          // Get zusatzleistungen for this cart item
          const zusatzleistungenResult = await client.query(`
            SELECT
              ciz.id,
              ciz.price,
              z.name,
              z.description
            FROM "cartItemZusatzleistungen" ciz
            INNER JOIN "zusatzleistungen" z ON ciz."zusatzleistungId" = z.id
            WHERE ciz."cartItemId" = $1
            ORDER BY z."displayOrder" ASC
          `, [item.id]);

          const zusatzleistungen = zusatzleistungenResult.rows.map(row => ({
            ...row,
            price: parseFloat(row.price),
          }));

          // Calculate zusatzleistungen total (charged once per cart item, not per quantity)
          const zusatzleistungenTotal = zusatzleistungen.reduce(
            (sum, service) => sum + service.price,
            0
          );

          // Total for this cart item including zusatzleistungen
          const totalWithServices = (unitPrice * currentQuantity) + zusatzleistungenTotal;

          return {
            ...item,
            currentSavings,
            nextTier: nextTierInfo,
            zusatzleistungen,
            zusatzleistungenTotal,
            totalWithServices,
          };
        })
      );

      // Calculate subtotal including zusatzleistungen
      const subtotal = itemsWithTierInfo.reduce(
        (sum, item) => sum + item.totalWithServices,
        0
      );

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            items: itemsWithTierInfo,
            count: cartItems.length,
            subtotal,
          },
        }),
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching cart:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to fetch cart',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500 }
    );
  }
};
