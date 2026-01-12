import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';

/**
 * POST /api/cart/add
 * Add a product to cart with custom configuration (dimensions, file upload)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const client = await pool.connect();

  try {
    const body = await request.json();
    const { productId, quantity, widthMm, heightMm, uploadedFileUrl, uploadedFileName } = body;

    // Debug logging
    console.log('[CART ADD] locals.user:', locals.user);
    console.log('[CART ADD] locals.session:', locals.session);

    // Get user from locals (set by middleware)
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

    if (!productId || !quantity || quantity < 1) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Product ID and quantity are required' },
        }),
        { status: 400 }
      );
    }

    // Fetch product to get pricing info and validate
    const productResult = await client.query(
      'SELECT * FROM products WHERE id = $1 AND "isActive" = true',
      [productId]
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

    // Validate dimensions if product accepts file upload
    if (product.acceptsFileUpload) {
      if (widthMm && product.maxWidthMm && widthMm > product.maxWidthMm) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: `Width cannot exceed ${product.maxWidthMm}mm` },
          }),
          { status: 400 }
        );
      }

      if (heightMm && product.minHeightMm && heightMm < product.minHeightMm) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: `Height must be at least ${product.minHeightMm}mm` },
          }),
          { status: 400 }
        );
      }

      if (heightMm && product.maxHeightMm && heightMm > product.maxHeightMm) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: `Height cannot exceed ${product.maxHeightMm}mm` },
          }),
          { status: 400 }
        );
      }
    }

    // Check inventory if tracking is enabled
    if (product.trackInventory && product.inventoryPolicy === 'deny') {
      if (product.inventoryQuantity < quantity) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              message: `Insufficient inventory. Only ${product.inventoryQuantity} available.`,
            },
          }),
          { status: 400 }
        );
      }
    }

    // Get price tier for quantity
    const priceTierResult = await client.query(
      `
      SELECT * FROM "priceTiers"
      WHERE "productId" = $1
        AND "minQuantity" <= $2
        AND ("maxQuantity" IS NULL OR "maxQuantity" >= $2)
      ORDER BY "minQuantity" DESC
      LIMIT 1
    `,
      [productId, quantity]
    );

    const unitPrice =
      priceTierResult.rows.length > 0
        ? parseFloat(priceTierResult.rows[0].pricePerUnit)
        : parseFloat(product.basePrice);

    // Create custom options object for dimensions and file info
    const customOptions = {
      widthMm: widthMm || null,
      heightMm: heightMm || null,
      uploadedFileUrl: uploadedFileUrl || null,
      uploadedFileName: uploadedFileName || null,
      priceCalculationMethod: product.priceCalculationMethod,
    };

    // Add to cart
    const cartItemResult = await client.query(
      `
      INSERT INTO "cartItems" (
        id,
        "userId",
        "productId",
        quantity,
        "unitPrice",
        "widthMm",
        "heightMm",
        "uploadedFileUrl",
        "uploadedFileName",
        "customOptions"
      ) VALUES (
        gen_random_uuid()::text,
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      RETURNING *
    `,
      [
        userId,
        productId,
        quantity,
        unitPrice,
        widthMm || null,
        heightMm || null,
        uploadedFileUrl || null,
        uploadedFileName || null,
        JSON.stringify(customOptions),
      ]
    );

    // Fetch cart count
    const cartCountResult = await client.query(
      'SELECT COUNT(id) as count FROM "cartItems" WHERE "userId" = $1',
      [userId]
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          cartItem: cartItemResult.rows[0],
          cartCount: parseInt(cartCountResult.rows[0].count),
        },
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding to cart:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to add item to cart',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500 }
    );
  } finally {
    client.release();
  }
};
