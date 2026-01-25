import type { APIRoute } from 'astro';
import { getFormRequestById } from '../../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ locals, params }) => {
  try {
    // Check admin authorization
    const user = locals.user;
    if (!user?.isAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Unauthorized - Admin access required' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const requestId = params.id;
    if (!requestId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Request ID is required' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get request with response history
    const result = await getFormRequestById(requestId);

    if (!result) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Request not found' },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching form request:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: 'Failed to fetch request' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
