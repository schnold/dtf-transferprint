import type { APIRoute } from 'astro';
import { getAllFormRequests } from '../../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
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

    // Parse query parameters for filtering
    const status = url.searchParams.get('status') || undefined;
    const formType = url.searchParams.get('formType') || undefined;
    const assignedTo = url.searchParams.get('assignedTo') || undefined;
    const dateFrom = url.searchParams.get('dateFrom') || undefined;
    const dateTo = url.searchParams.get('dateTo') || undefined;
    const search = url.searchParams.get('search') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get filtered requests
    const { requests, totalCount } = await getAllFormRequests({
      status,
      formType,
      assignedTo,
      dateFrom,
      dateTo,
      search,
      limit,
      offset,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          requests,
          totalCount,
          limit,
          offset,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching form requests:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: 'Failed to fetch requests' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
