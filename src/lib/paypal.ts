import paypal from '@paypal/checkout-server-sdk';

// Configure PayPal environment
function getPayPalEnvironment() {
  const clientId = import.meta.env.PAYPAL_CLIENT_ID;
  const clientSecret = import.meta.env.PAYPAL_CLIENT_SECRET;
  const mode = import.meta.env.PAYPAL_MODE || 'sandbox';

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  if (mode === 'live') {
    return new paypal.core.LiveEnvironment(clientId, clientSecret);
  } else {
    return new paypal.core.SandboxEnvironment(clientId, clientSecret);
  }
}

// Create PayPal client
function getPayPalClient() {
  return new paypal.core.PayPalHttpClient(getPayPalEnvironment());
}

interface OrderBreakdown {
  subtotal: number;
  userDiscountAmount: number;
  campaignDiscountAmount: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
}

/**
 * Create a PayPal order with detailed amount breakdown
 */
export async function createPayPalOrder(breakdown: OrderBreakdown) {
  const client = getPayPalClient();

  // PayPal expects: item_total + shipping + tax_total - discount = total
  // item_total should be the original subtotal (before discounts)
  const totalDiscount = breakdown.userDiscountAmount + breakdown.campaignDiscountAmount;

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: 'EUR',
          value: breakdown.total.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: 'EUR',
              value: breakdown.subtotal.toFixed(2),
            },
            shipping: {
              currency_code: 'EUR',
              value: breakdown.shippingCost.toFixed(2),
            },
            tax_total: {
              currency_code: 'EUR',
              value: breakdown.taxAmount.toFixed(2),
            },
            discount: {
              currency_code: 'EUR',
              value: totalDiscount.toFixed(2),
            },
          },
        },
        description: 'DTF Transferprint Bestellung',
      },
    ],
    application_context: {
      brand_name: 'DTF Transferprint',
      locale: 'de-DE',
      landing_page: 'NO_PREFERENCE',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      return_url: `${import.meta.env.BETTER_AUTH_URL}/checkout/success`,
      cancel_url: `${import.meta.env.BETTER_AUTH_URL}/checkout/cancel`,
    },
  });

  try {
    const response = await client.execute(request);

    // Get approval URL
    const approvalUrl = response.result.links?.find(
      (link: any) => link.rel === 'approve'
    )?.href;

    return {
      id: response.result.id,
      approvalUrl: approvalUrl || '',
      status: response.result.status,
    };
  } catch (error: any) {
    console.error('PayPal order creation error:', error);
    throw new Error(`Failed to create PayPal order: ${error.message}`);
  }
}

/**
 * Capture a PayPal order payment
 */
export async function capturePayPalOrder(orderId: string) {
  const client = getPayPalClient();

  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});

  try {
    const response = await client.execute(request);

    // Get capture ID from the response
    const captureId = response.result.purchase_units?.[0]?.payments?.captures?.[0]?.id;

    return {
      id: response.result.id,
      captureId: captureId || '',
      status: response.result.status,
      payer: response.result.payer,
    };
  } catch (error: any) {
    console.error('PayPal order capture error:', error);
    throw new Error(`Failed to capture PayPal order: ${error.message}`);
  }
}

/**
 * Get PayPal order details
 */
export async function getPayPalOrderDetails(orderId: string) {
  const client = getPayPalClient();

  const request = new paypal.orders.OrdersGetRequest(orderId);

  try {
    const response = await client.execute(request);
    return response.result;
  } catch (error: any) {
    console.error('PayPal order details error:', error);
    throw new Error(`Failed to get PayPal order details: ${error.message}`);
  }
}
