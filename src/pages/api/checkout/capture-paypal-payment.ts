import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';
import { capturePayPalOrder } from '../../../lib/paypal';
import { createOrder } from '../../../lib/db';
import { sendEmail } from '../../../lib/email';
import { generateOrderConfirmationEmail } from '../../../lib/order-email-template';
import { checkRateLimit, RateLimits, getRateLimitHeaders } from '../../../lib/rate-limiter';

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

        // Get base template function from email-templates
        const getBaseTemplate = (content: string, unsubscribeUrl: string): string => {
          // Simplified version - in production, import from email-templates
          return content;
        };

        const { html, text } = generateOrderConfirmationEmail(
          {
            userName: user.name,
            userId: user.id,
            baseUrl: import.meta.env.BETTER_AUTH_URL || 'http://localhost:4321',
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
            orderUrl: `${import.meta.env.BETTER_AUTH_URL || 'http://localhost:4321'}/order/${order.orderNumber}`,
          },
          getBaseTemplate
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
