import type { APIRoute } from 'astro';
import { updateOrderStatusWithTracking, getOrderWithDetails } from '../../../../../lib/db';
import { sendEmail } from '../../../../../lib/email';
import {
  generateOrderProcessingEmail,
  generateOrderReadyEmail,
  generateOrderShippedEmail,
  generateOrderDeliveredEmail,
} from '../../../../../lib/email-templates/order-status-emails';

// PATCH - Update order status with tracking
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user;

  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Unauthorized' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Order ID is required' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { status, fulfillmentStatus, trackingNumber, trackingUrl, note, sendEmail: shouldSendEmail } = body;

    // Validate required fields
    if (!status) {
      return new Response(JSON.stringify({ success: false, error: { message: 'Status is required' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate status values
    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ success: false, error: { message: 'Invalid status value' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate tracking info for shipped status
    if (status === 'shipped') {
      if (!trackingNumber || !trackingUrl) {
        return new Response(JSON.stringify({
          success: false,
          error: { message: 'Tracking number and URL are required for shipped status' }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Validate tracking URL format
      if (!trackingUrl.startsWith('https://')) {
        return new Response(JSON.stringify({
          success: false,
          error: { message: 'Tracking URL must be HTTPS' }
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Get order details before update (for email)
    const orderBefore = await getOrderWithDetails(id);
    if (!orderBefore) {
      return new Response(JSON.stringify({ success: false, error: { message: 'Order not found' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update order status
    await updateOrderStatusWithTracking(id, status, {
      fulfillmentStatus,
      trackingNumber,
      trackingUrl,
      note,
      updatedByUserId: user.id,
      sendEmail: shouldSendEmail !== false,
    });

    // Send email notification if requested
    if (shouldSendEmail !== false && orderBefore.user && orderBefore.user.email) {
      try {
        const baseUrl = new URL(request.url).origin;
        const orderUrl = `${baseUrl}/order/${orderBefore.order.orderNumber}`;

        // Format date and total
        const orderDate = new Intl.DateTimeFormat('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(orderBefore.order.createdAt));

        const orderTotal = new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
        }).format(orderBefore.order.total);

        const emailData = {
          userName: orderBefore.user.name || 'Kunde',
          userId: orderBefore.user.id,
          baseUrl,
          orderNumber: orderBefore.order.orderNumber,
          orderDate,
          orderTotal,
          orderUrl,
        };

        let emailTemplate;
        let subject = '';

        // Generate appropriate email based on status
        if (status === 'processing' && fulfillmentStatus === 'unfulfilled') {
          // In Bearbeitung
          emailTemplate = generateOrderProcessingEmail(emailData);
          subject = `Ihre Bestellung wird bearbeitet - ${orderBefore.order.orderNumber}`;
        } else if (status === 'processing' && fulfillmentStatus === 'fulfilled') {
          // Versandfertig
          emailTemplate = generateOrderReadyEmail(emailData);
          subject = `Ihre Bestellung ist versandbereit - ${orderBefore.order.orderNumber}`;
        } else if (status === 'shipped') {
          // Versendet
          emailTemplate = generateOrderShippedEmail({
            ...emailData,
            trackingNumber: trackingNumber || '',
            trackingUrl: trackingUrl || '',
          });
          subject = `Ihre Bestellung wurde versandt - ${orderBefore.order.orderNumber}`;
        } else if (status === 'delivered') {
          // Abgeschlossen
          emailTemplate = generateOrderDeliveredEmail(emailData);
          subject = `Ihre Bestellung wurde zugestellt - ${orderBefore.order.orderNumber}`;
        }

        // Send email if template was generated
        if (emailTemplate) {
          await sendEmail({
            to: orderBefore.user.email,
            subject,
            html: emailTemplate.html,
            text: emailTemplate.text,
          });
          console.log(`✅ Order status email sent to: ${orderBefore.user.email}`);
        }
      } catch (emailError) {
        // Log email error but don't fail the request
        console.error('❌ Failed to send status update email:', emailError);
      }
    }

    // Get updated order details
    const orderAfter = await getOrderWithDetails(id);

    return new Response(JSON.stringify({
      success: true,
      data: orderAfter,
      message: 'Order status updated successfully',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: error.message || 'Failed to update order status' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
