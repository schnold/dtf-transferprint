import type { APIRoute } from 'astro';
import { pool } from '@/lib/db';

export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    // Check if user is admin
    const session = locals.session;
    if (!session?.user?.isAdmin) {
      return new Response(JSON.stringify({
        success: false,
        error: { message: 'Unauthorized - Admin access required' }
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = params;
    const { specifications } = await request.json();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete all existing specifications for this product
      await client.query(
        'DELETE FROM "productSpecifications" WHERE "productId" = $1',
        [id]
      );

      // Insert new specifications
      if (specifications && specifications.length > 0) {
        for (const spec of specifications) {
          // Generate ID for new specifications (preserve existing ID if provided and not 'new')
          const specId = spec.id && spec.id !== 'new'
            ? spec.id
            : `spec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          await client.query(`
            INSERT INTO "productSpecifications" (
              id, "productId", "specKey", "specLabel", "specValue", "displayOrder"
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            specId,
            id,
            spec.specKey,
            spec.specLabel,
            spec.specValue,
            spec.displayOrder || 0
          ]);
        }
      }

      await client.query('COMMIT');

      return new Response(JSON.stringify({
        success: true,
        message: 'Specifications updated successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating specifications:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: error.message || 'Internal server error' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
