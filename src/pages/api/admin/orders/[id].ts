import type { APIRoute } from 'astro';
import { getOrderWithDetails } from '../../../../lib/db';

// GET - Get single order with complete details
export const GET: APIRoute = async ({ params, locals }) => {
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
    const orderData = await getOrderWithDetails(id);

    if (!orderData) {
      return new Response(JSON.stringify({ success: false, error: { message: 'Order not found' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: orderData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to fetch order details' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
