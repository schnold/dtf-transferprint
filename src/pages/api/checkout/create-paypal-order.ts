import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';
import { createPayPalOrder } from '../../../lib/paypal';
import { validateDiscount, calculateDiscount } from '../../../lib/db';

/**
 * POST /api/checkout/create-paypal-order
 * Creates a PayPal order with server-side price calculation
 * Applies user discount and optional campaign discount code
 */
export const POST: APIRoute = async ({ request, locals }) => {
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
    const { discountCode } = body;

    // Fetch user with discount percentage
    const userResult = await client.query(
      'SELECT "discountPercent" FROM "user" WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'User not found' },
        }),
        { status: 404 }
      );
    }

    const userDiscountPercent = parseFloat(userResult.rows[0].discountPercent) || 0;

    // Fetch cart items for the user
    const cartResult = await client.query(
      `
      SELECT
        ci.*,
        p.name as "productName",
        p."basePrice"
      FROM "cartItems" ci
      INNER JOIN products p ON ci."productId" = p.id
      WHERE ci."userId" = $1
    `,
      [userId]
    );

    if (cartResult.rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Cart is empty' },
        }),
        { status: 400 }
      );
    }

    // Calculate subtotal with volume pricing + zusatzleistungen
    let subtotal = 0;
    const cartSnapshot = [];

    for (const item of cartResult.rows) {
      // Price tier already applied when adding to cart (stored in unitPrice)
      const itemSubtotal = parseFloat(item.unitPrice) * item.quantity;

      // Add zusatzleistungen total for this cart item
      const servicesResult = await client.query(
        'SELECT SUM(price) as total FROM "cartItemZusatzleistungen" WHERE "cartItemId" = $1',
        [item.id]
      );
      const servicesTotal = parseFloat(servicesResult.rows[0]?.total || 0);

      subtotal += itemSubtotal + servicesTotal;

      // Create snapshot for session storage
      cartSnapshot.push({
        cartItemId: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice),
        servicesTotal: servicesTotal,
        customOptions: item.customOptions,
        uploadedFileUrl: item.uploadedFileUrl,
        uploadedFileName: item.uploadedFileName,
      });
    }

    // Apply user discount
    const userDiscountAmount = subtotal * (userDiscountPercent / 100);
    const subtotalAfterUserDiscount = subtotal - userDiscountAmount;

    // Apply campaign discount code if provided
    let campaignDiscountAmount = 0;
    let discountId = null;

    if (discountCode) {
      const cartItems = cartResult.rows.map(row => ({
        id: row.id,
        userId: row.userId,
        productId: row.productId,
        productName: row.productName,
        productSlug: '',
        quantity: row.quantity,
        unitPrice: parseFloat(row.unitPrice),
        currentPrice: parseFloat(row.unitPrice),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));

      const validation = await validateDiscount(discountCode, userId, cartItems);

      if (!validation.valid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: validation.error || 'Invalid discount code' },
          }),
          { status: 400 }
        );
      }

      if (validation.discount) {
        const discount = validation.discount;
        discountId = discount.id;

        // Check minimum purchase amount
        if (discount.minPurchaseAmount && subtotalAfterUserDiscount < discount.minPurchaseAmount) {
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                message: `Minimum purchase amount of €${discount.minPurchaseAmount.toFixed(
                  2
                )} required for this discount code`,
              },
            }),
            { status: 400 }
          );
        }

        // Calculate discount on already user-discounted price
        if (discount.discountType !== 'free_shipping') {
          campaignDiscountAmount = await calculateDiscount(discount, subtotalAfterUserDiscount);
        }
      }
    }

    // Get selected shipping profile or default
    const shippingSelectionResult = await client.query(
      `
      SELECT "shippingProfileId" FROM "userCartShipping"
      WHERE "userId" = $1
    `,
      [userId]
    );

    let shippingProfileId = shippingSelectionResult.rows[0]?.shippingProfileId;

    // If no selection, get default shipping profile
    if (!shippingProfileId) {
      const defaultShippingResult = await client.query(
        'SELECT id FROM "shippingProfiles" WHERE "isDefault" = true AND "isActive" = true LIMIT 1'
      );
      shippingProfileId = defaultShippingResult.rows[0]?.id;
    }

    // Fetch shipping cost
    let shippingCost = 0;
    let freeShippingThreshold = null;

    if (shippingProfileId) {
      const shippingResult = await client.query(
        'SELECT "basePrice", "freeShippingThreshold" FROM "shippingProfiles" WHERE id = $1',
        [shippingProfileId]
      );

      if (shippingResult.rows.length > 0) {
        const shipping = shippingResult.rows[0];
        freeShippingThreshold = shipping.freeShippingThreshold
          ? parseFloat(shipping.freeShippingThreshold)
          : null;

        // Check if free shipping applies
        if (
          freeShippingThreshold &&
          subtotalAfterUserDiscount - campaignDiscountAmount >= freeShippingThreshold
        ) {
          shippingCost = 0;
        } else {
          shippingCost = parseFloat(shipping.basePrice);
        }
      }
    }

    // Calculate tax (19% MwSt on discounted subtotal + shipping)
    const taxableAmount = subtotalAfterUserDiscount - campaignDiscountAmount + shippingCost;
    const taxAmount = taxableAmount * 0.19;

    // Calculate final total
    const total = taxableAmount + taxAmount;

    // Create PayPal order
    const paypalOrder = await createPayPalOrder({
      subtotal,
      userDiscountAmount,
      campaignDiscountAmount,
      shippingCost,
      taxAmount,
      total,
    });

    // Store session in database with 3-hour expiration
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours

    await client.query(
      `
      INSERT INTO "paypalOrderSessions" (
        id,
        "paypalOrderId",
        "userId",
        "cartSnapshot",
        subtotal,
        "userDiscountPercent",
        "userDiscountAmount",
        "campaignDiscountAmount",
        "discountCode",
        "discountId",
        "shippingCost",
        "shippingProfileId",
        "taxAmount",
        total,
        "expiresAt"
      ) VALUES (
        gen_random_uuid()::text,
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
    `,
      [
        paypalOrder.id,
        userId,
        JSON.stringify(cartSnapshot),
        subtotal,
        userDiscountPercent,
        userDiscountAmount,
        campaignDiscountAmount,
        discountCode || null,
        discountId,
        shippingCost,
        shippingProfileId,
        taxAmount,
        total,
        expiresAt,
      ]
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          paypalOrderId: paypalOrder.id,
          approvalUrl: paypalOrder.approvalUrl,
          breakdown: {
            subtotal,
            userDiscountPercent,
            userDiscountAmount,
            campaignDiscountAmount,
            shippingCost,
            taxAmount,
            total,
          },
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error creating PayPal order:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to create PayPal order',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500 }
    );
  } finally {
    client.release();
  }
};
