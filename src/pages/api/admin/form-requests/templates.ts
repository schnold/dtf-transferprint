import type { APIRoute } from 'astro';
import { getEmailTemplates } from '../../../../lib/db';

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

    // Parse query parameters
    const category = url.searchParams.get('category') || undefined;
    const isActiveParam = url.searchParams.get('isActive');
    const isActive = isActiveParam !== null ? isActiveParam === 'true' : undefined;

    // Get templates
    const templates = await getEmailTemplates({ category, isActive });

    return new Response(
      JSON.stringify({
        success: true,
        data: templates,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: 'Failed to fetch templates' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
