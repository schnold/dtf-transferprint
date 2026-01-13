import type { APIRoute} from 'astro';
import { pool } from '../../../lib/db';

export const GET: APIRoute = async () => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT id, name, description, "basePrice", "freeShippingThreshold", "estimatedDays", "isDefault"
        FROM "shippingProfiles"
        WHERE "isActive" = true
        ORDER BY "displayOrder", "createdAt"
      `);

      const profiles = result.rows.map(row => ({
        ...row,
        basePrice: parseFloat(row.basePrice),
        freeShippingThreshold: row.freeShippingThreshold ? parseFloat(row.freeShippingThreshold) : null,
      }));

      return new Response(JSON.stringify({
        success: true,
        data: profiles
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching active shipping profiles:', error);
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Failed to fetch shipping profiles' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
