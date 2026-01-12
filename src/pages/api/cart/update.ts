import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';

/**
 * PUT /api/cart/update
 * Update cart item quantity
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
    const { cartItemId, quantity } = body;

    if (!cartItemId || quantity === undefined || quantity < 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Cart item ID and quantity are required' },
        }),
        { status: 400 }
      );
    }

    // Verify cart item belongs to user
    const verifyResult = await client.query(
      'SELECT * FROM "cartItems" WHERE id = $1 AND "userId" = $2',
      [cartItemId, userId]
    );

    if (verifyResult.rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Cart item not found' },
        }),
        { status: 404 }
      );
    }

    // If quantity is 0, remove the item
    if (quantity === 0) {
      await client.query('DELETE FROM "cartItems" WHERE id = $1', [cartItemId]);
    } else {
      // Get product and cart item info for price recalculation
      const cartItemResult = await client.query(
        `SELECT ci.*, p."basePrice" 
         FROM "cartItems" ci 
         JOIN products p ON ci."productId" = p.id 
         WHERE ci.id = $1`,
        [cartItemId]
      );

      if (cartItemResult.rows.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: 'Cart item not found' },
          }),
          { status: 404 }
        );
      }

      const cartItem = cartItemResult.rows[0];
      const productId = cartItem.productId;

      // Recalculate price based on new quantity and price tiers
      const priceTierResult = await client.query(
        `SELECT * FROM "priceTiers"
         WHERE "productId" = $1
           AND "minQuantity" <= $2
           AND ("maxQuantity" IS NULL OR "maxQuantity" >= $2)
         ORDER BY "minQuantity" DESC
         LIMIT 1`,
        [productId, quantity]
      );

      const newUnitPrice = priceTierResult.rows.length > 0
        ? parseFloat(priceTierResult.rows[0].pricePerUnit)
        : parseFloat(cartItem.basePrice);

      // Update quantity AND unit price (server-side security)
      await client.query(
        `UPDATE "cartItems" 
         SET quantity = $2, "unitPrice" = $3, "updatedAt" = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [cartItemId, quantity, newUnitPrice]
      );
    }

    // Get updated cart count and totals
    const cartCountResult = await client.query(
      'SELECT COUNT(id) as count FROM "cartItems" WHERE "userId" = $1',
      [userId]
    );

    // Get updated cart items with price tier info
    const updatedCartResult = await client.query(
      `SELECT ci.*, p.name as "productName", p."basePrice"
       FROM "cartItems" ci
       JOIN products p ON ci."productId" = p.id
       WHERE ci."userId" = $1`,
      [userId]
    );

    // Calculate savings and next tier info for each item
    const itemsWithTierInfo = await Promise.all(
      updatedCartResult.rows.map(async (item) => {
        // Get all price tiers for this product
        const tiersResult = await client.query(
          `SELECT * FROM "priceTiers"
           WHERE "productId" = $1
           ORDER BY "minQuantity" ASC`,
          [item.productId]
        );

        const tiers = tiersResult.rows;
        const currentQuantity = item.quantity;
        const unitPrice = parseFloat(item.unitPrice);
        const basePrice = parseFloat(item.basePrice);

        // Calculate current savings
        const currentSavings = (basePrice - unitPrice) * currentQuantity;

        // Find next tier
        const nextTier = tiers.find(t => t.minQuantity > currentQuantity);
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

        return {
          cartItemId: item.id,
          unitPrice,
          currentSavings,
          nextTier: nextTierInfo,
        };
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          cartCount: parseInt(cartCountResult.rows[0].count),
          itemsWithTierInfo,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating cart:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to update cart',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500 }
    );
  } finally {
    client.release();
  }
};
