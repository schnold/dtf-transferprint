import type { APIRoute } from 'astro';
import { updateUserDiscount } from '../../../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check if user is admin
    const user = locals.user;
    if (!user?.isAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized - Admin access required',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();
    const { userId, discountPercent } = data;

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User ID is required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const discount = parseFloat(discountPercent);

    if (isNaN(discount) || discount < 0 || discount > 100) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Discount must be a number between 0 and 100',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await updateUserDiscount(userId, discount);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Discount updated successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating user discount:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update discount',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
