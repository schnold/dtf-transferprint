import type { APIRoute } from 'astro';
import { updateFormRequestStatus } from '../../../../../lib/db';

export const prerender = false;

export const PATCH: APIRoute = async ({ locals, params, request }) => {
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

    const body = await request.json();
    const { status, priority, assignedTo, note } = body;

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Invalid status value' },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update request status
    await updateFormRequestStatus(requestId, status, {
      assignedTo,
      priority,
      note,
      updatedByUserId: user.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Request status updated successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating request status:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: 'Failed to update request status' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
