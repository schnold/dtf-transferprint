import type { APIRoute} from 'astro';
import { pool } from '../../../../lib/db';

// GET - Get available zusatzleistungen for a product (public endpoint)
export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(JSON.stringify({ success: false, error: { message: 'Product slug is required' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const client = await pool.connect();
    try {
      // Get product ID from slug
      const productResult = await client.query(
        'SELECT id FROM "products" WHERE slug = $1 AND "isActive" = true',
        [slug]
      );

      if (productResult.rows.length === 0) {
        return new Response(JSON.stringify({ success: false, error: { message: 'Product not found' } }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const productId = productResult.rows[0].id;

      // Get only active zusatzleistungen that are enabled for this product
      const result = await client.query(`
        SELECT
          z.id,
          z.name,
          z.description,
          z.price
        FROM "zusatzleistungen" z
        INNER JOIN "productZusatzleistungen" pz
          ON z.id = pz."zusatzleistungId"
        WHERE pz."productId" = $1
          AND z."isActive" = true
          AND pz."isEnabled" = true
        ORDER BY z."displayOrder" ASC, z."createdAt" ASC
      `, [productId]);

      return new Response(JSON.stringify({
        success: true,
        data: result.rows.map(row => ({
          ...row,
          price: parseFloat(row.price),
        }))
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching product zusatzleistungen:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to fetch zusatzleistungen' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
