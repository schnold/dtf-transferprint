import type { APIRoute } from 'astro';
import { getAllOrders } from '../../../../lib/db';

// GET - Get all orders with filtering
export const GET: APIRoute = async ({ url, locals }) => {
  const user = locals.user;

  if (!user?.isAdmin) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Unauthorized' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const searchParams = url.searchParams;
    const status = searchParams.get('status') || 'all';
    const fulfillmentStatus = searchParams.get('fulfillmentStatus') || 'all';
    const paymentStatus = searchParams.get('paymentStatus') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { orders, totalCount } = await getAllOrders({
      status: status !== 'all' ? status : undefined,
      fulfillmentStatus: fulfillmentStatus !== 'all' ? fulfillmentStatus : undefined,
      paymentStatus: paymentStatus !== 'all' ? paymentStatus : undefined,
      limit,
      offset,
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        orders,
        totalCount,
        limit,
        offset,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to fetch orders' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
