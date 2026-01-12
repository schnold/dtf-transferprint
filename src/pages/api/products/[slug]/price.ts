import type { APIRoute } from 'astro';
import { pool } from '../../../../lib/db';

/**
 * GET /api/products/[slug]/price?quantity=5
 * Calculate price for a product based on quantity (server-side validation)
 * This ensures prices are always calculated correctly and cannot be manipulated client-side
 */
export const GET: APIRoute = async ({ params, url }) => {
  const client = await pool.connect();

  try {
    const { slug } = params;
    const quantity = parseInt(url.searchParams.get('quantity') || '1');

    if (!slug) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Product slug is required' },
        }),
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Quantity must be at least 1' },
        }),
        { status: 400 }
      );
    }

    // Fetch product
    const productResult = await client.query(
      'SELECT * FROM products WHERE slug = $1 AND "isActive" = true',
      [slug]
    );

    if (productResult.rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Product not found or inactive' },
        }),
        { status: 404 }
      );
    }

    const product = productResult.rows[0];
    const basePrice = parseFloat(product.basePrice);

    // Fetch price tiers for this product
    const priceTierResult = await client.query(
      `
      SELECT * FROM "priceTiers"
      WHERE "productId" = $1
        AND "minQuantity" <= $2
        AND ("maxQuantity" IS NULL OR "maxQuantity" >= $2)
      ORDER BY "minQuantity" DESC
      LIMIT 1
    `,
      [product.id, quantity]
    );

    // Determine unit price and discount
    let unitPrice = basePrice;
    let discountPercent = 0;
    let applicableTier = null;

    if (priceTierResult.rows.length > 0) {
      const tier = priceTierResult.rows[0];
      unitPrice = parseFloat(tier.pricePerUnit);
      discountPercent = parseFloat(tier.discountPercent);
      applicableTier = {
        id: tier.id,
        minQuantity: tier.minQuantity,
        maxQuantity: tier.maxQuantity,
        discountPercent: discountPercent,
        pricePerUnit: unitPrice,
      };
    }

    // Calculate totals
    const subtotal = unitPrice * quantity;
    const totalDiscount = (basePrice - unitPrice) * quantity;
    const total = subtotal;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          unitPrice,
          basePrice,
          discountPercent,
          quantity,
          subtotal,
          totalDiscount,
          total,
          applicableTier,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error calculating price:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to calculate price',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500 }
    );
  } finally {
    client.release();
  }
};
