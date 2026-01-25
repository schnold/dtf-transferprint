import type { APIRoute } from 'astro';
import { getFormRequestStats } from '../../../../lib/db';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
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

    // Get statistics
    const stats = await getFormRequestStats();

    return new Response(
      JSON.stringify({
        success: true,
        data: stats,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching form request stats:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: 'Failed to fetch statistics' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
