import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';
import { capturePayPalOrder } from '../../../lib/paypal';
import { createOrder } from '../../../lib/db';
import { sendEmail } from '../../../lib/email';
import { generateOrderConfirmationEmail } from '../../../lib/order-email-template';
import { getBaseTemplate } from '../../../lib/email-templates';
import { checkRateLimit, RateLimits, getRateLimitHeaders } from '../../../lib/rate-limiter';
import { migrateCartFilesToPermanent } from '../../../lib/file-migration';

/**
 * POST /api/checkout/capture-paypal-payment
 * Captures a PayPal payment and creates the order record
 * Implements idempotency and security checks
 * Protected by rate limiting to prevent abuse
 */
export const POST: APIRoute = async ({ request, locals }) => {
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

  // Rate limiting check
  const rateLimit = checkRateLimit(userId, RateLimits.PAYMENT_CAPTURE);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Too many payment capture requests. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...getRateLimitHeaders(rateLimit),
        },
      }
    );
  }

  const client = await pool.connect();

  try {

    const body = await request.json();
    const { paypalOrderId } = body;

    if (!paypalOrderId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'PayPal order ID is required' },
        }),
        { status: 400 }
      );
    }

    // Retrieve PayPal session
    const sessionResult = await client.query(
      `
      SELECT * FROM "paypalOrderSessions"
      WHERE "paypalOrderId" = $1
    `,
      [paypalOrderId]
    );

    if (sessionResult.rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'PayPal order session not found' },
        }),
        { status: 404 }
      );
    }

    const session = sessionResult.rows[0];

    // Get addressId from session
    const addressId = session.addressId;

    if (!addressId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Address not found in session. Please restart checkout.' },
        }),
        { status: 400 }
      );
    }

    // Verify session belongs to authenticated user
    if (session.userId !== userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Unauthorized - This PayPal order does not belong to you' },
        }),
        { status: 403 }
      );
    }

    // Check if already captured (idempotency)
    if (session.captured) {
      // Return existing order
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            orderId: session.orderId,
            message: 'Payment already captured',
          },
        }),
        { status: 200 }
      );
    }

    // Check if session has expired
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'PayPal order session has expired. Please start a new checkout.' },
        }),
        { status: 400 }
      );
    }

    // Get the selected address and verify it belongs to the user
    const addressResult = await client.query(
      `
      SELECT id, "addressType", "userId" FROM "userAddresses"
      WHERE id = $1
    `,
      [addressId]
    );

    if (addressResult.rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Selected address not found.' },
        }),
        { status: 404 }
      );
    }

    const selectedAddress = addressResult.rows[0];

    // Verify address belongs to user
    if (selectedAddress.userId !== userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Unauthorized - This address does not belong to you' },
        }),
        { status: 403 }
      );
    }

    // Use the selected address for both shipping and billing
    const shippingAddressId = selectedAddress.id;
    const billingAddressId = selectedAddress.id;

    // Capture PayPal payment
    let captureResult;
    try {
      captureResult = await capturePayPalOrder(paypalOrderId);
    } catch (error: any) {
      console.error('PayPal capture error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: 'Failed to capture PayPal payment',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          },
        }),
        { status: 500 }
      );
    }

    // Begin database transaction
    try {
      await client.query('BEGIN');

      // ========================================
      // MIGRATE FILES FROM TEMP TO PERMANENT
      // ========================================
      // Fetch cart items to check for uploaded files
      const cartItemsResult = await client.query(
        `SELECT id, "uploadedFileUrl", "uploadedFileName"
         FROM "cartItems"
         WHERE "userId" = $1`,
        [userId]
      );

      const cartItems = cartItemsResult.rows;
      const hasUploadedFiles = cartItems.some(
        (item) => item.uploadedFileUrl && item.uploadedFileUrl.includes('temp-uploads/')
      );

      // If there are uploaded files, migrate them to permanent storage
      if (hasUploadedFiles) {
        console.log(`Migrating ${cartItems.length} cart file(s) to permanent storage...`);

        // Generate order number first (needed for permanent file path)
        const tempOrderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Migrate files
        const migration = await migrateCartFilesToPermanent(cartItems, tempOrderNumber, userId);

        if (!migration.success) {
          // CRITICAL ERROR: Payment captured but file migration failed
          const errorMessage = migration.errors.join('; ');
          console.error('🚨 CRITICAL: File migration failed after PayPal capture', {
            paypalOrderId,
            paypalCaptureId: captureResult.captureId,
            userId,
            errors: migration.errors,
          });

          // Send alert email to admin (optional but recommended)
          try {
            await sendEmail({
              to: process.env.ADMIN_EMAIL || 'admin@example.com',
              subject: `🚨 CRITICAL: File Migration Failed - ${paypalOrderId}`,
              html: `
                <h2>File Migration Failed After Payment</h2>
                <p><strong>PayPal Order ID:</strong> ${paypalOrderId}</p>
                <p><strong>PayPal Capture ID:</strong> ${captureResult.captureId}</p>
                <p><strong>User ID:</strong> ${userId}</p>
                <p><strong>Errors:</strong></p>
                <ul>${migration.errors.map((e) => `<li>${e}</li>`).join('')}</ul>
                <p><strong>Action Required:</strong> Manually migrate files and create order.</p>
              `,
              text: `File migration failed. PayPal Order: ${paypalOrderId}, User: ${userId}, Errors: ${errorMessage}`,
            });
          } catch (emailError) {
            console.error('Failed to send admin alert email:', emailError);
          }

          // Rollback transaction
          await client.query('ROLLBACK');

          return new Response(
            JSON.stringify({
              success: false,
              error: {
                message:
                  'Zahlung erhalten, aber Datei-Upload fehlgeschlagen. Bitte kontaktieren Sie den Support.',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
              },
            }),
            { status: 500 }
          );
        }

        // Update cart items with permanent URLs
        console.log(`Successfully migrated ${migration.urlMapping.size} file(s)`);

        for (const [tempUrl, permanentUrl] of migration.urlMapping.entries()) {
          await client.query(
            `UPDATE "cartItems"
             SET "uploadedFileUrl" = $1
             WHERE "uploadedFileUrl" = $2 AND "userId" = $3`,
            [permanentUrl, tempUrl, userId]
          );
        }
      }

      // Create order record with pre-calculated amounts from session
      const order = await createOrder(
        userId,
        shippingAddressId,
        billingAddressId,
        {
          discountCode: session.discountCode,
          userDiscountPercent: parseFloat(session.userDiscountPercent),
          paypalOrderId: paypalOrderId,
          paypalCaptureId: captureResult.captureId,
          shippingProfileId: session.shippingProfileId,
          shippingCost: parseFloat(session.shippingCost),
          subtotal: parseFloat(session.subtotal),
          userDiscountAmount: parseFloat(session.userDiscountAmount),
          campaignDiscountAmount: parseFloat(session.campaignDiscountAmount),
          taxAmount: parseFloat(session.taxAmount),
          total: parseFloat(session.total),
        }
      );

      // Mark session as captured
      await client.query(
        `
        UPDATE "paypalOrderSessions"
        SET captured = true, "capturedAt" = CURRENT_TIMESTAMP, "orderId" = $2
        WHERE "paypalOrderId" = $1
      `,
        [paypalOrderId, order.id]
      );

      // Update order payment status to paid
      await client.query(
        `
        UPDATE orders
        SET "paymentStatus" = 'paid'
        WHERE id = $1
      `,
        [order.id]
      );

      await client.query('COMMIT');

      // Send confirmation email
      try {
        // Fetch order items for email
        const orderItemsResult = await client.query(
          'SELECT "productName", quantity, "totalPrice" FROM "orderItems" WHERE "orderId" = $1',
          [order.id]
        );

        const formatPrice = (price: number) => {
          return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: 'EUR',
          }).format(price);
        };

        const formatDate = (date: Date) => {
          return new Intl.DateTimeFormat('de-DE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date(date));
        };

        const orderItems = orderItemsResult.rows.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          price: formatPrice(parseFloat(item.totalPrice)),
        }));

        // Use shared email base template with order-specific footer reason
        const getOrderBaseTemplate = (content: string, unsubscribeUrl: string, title?: string): string =>
          getBaseTemplate(content, unsubscribeUrl, title ?? 'Bestellbestätigung - Selini-Shirt', 'weil Sie eine Bestellung bei Selini-Shirt aufgegeben haben.');

        const { html, text } = generateOrderConfirmationEmail(
          {
            userName: user.name,
            userId: user.id,
            baseUrl: process.env.BETTER_AUTH_URL || 'http://localhost:4321',
            orderNumber: order.orderNumber,
            orderDate: formatDate(order.createdAt),
            orderTotal: formatPrice(parseFloat(order.total)),
            orderItems,
            subtotal: formatPrice(parseFloat(order.subtotal)),
            discountAmount:
              parseFloat(order.discountAmount) > 0
                ? formatPrice(parseFloat(order.discountAmount))
                : undefined,
            discountCode: order.discountCode || undefined,
            userDiscountPercent:
              parseFloat(order.userDiscountPercent) > 0
                ? parseFloat(order.userDiscountPercent)
                : undefined,
            shippingCost: formatPrice(parseFloat(order.shippingCost)),
            taxAmount: formatPrice(parseFloat(order.taxAmount)),
            orderUrl: `${process.env.BETTER_AUTH_URL || 'http://localhost:4321'}/order/${order.orderNumber}`,
          },
          getOrderBaseTemplate
        );

        await sendEmail({
          to: user.email,
          subject: `Bestellbestätigung - ${order.orderNumber}`,
          html,
          text,
        });

        // Log email sent without exposing PII
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Order confirmation email sent for order: ${order.orderNumber}`);
        }
      } catch (emailError) {
        // Don't fail the order if email fails
        console.error('❌ Failed to send order confirmation email:', emailError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            orderId: order.id,
            orderNumber: order.orderNumber,
          },
        }),
        { status: 200 }
      );
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating order after PayPal capture:', error);

      // Note: Payment was captured but order creation failed
      // This is a critical error that needs manual intervention
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message:
              'Payment captured but order creation failed. Please contact support with your PayPal transaction ID.',
            paypalOrderId: paypalOrderId,
            paypalCaptureId: captureResult.captureId,
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          },
        }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error capturing PayPal payment:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to process payment capture',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500 }
    );
  } finally {
    client.release();
  }
};
