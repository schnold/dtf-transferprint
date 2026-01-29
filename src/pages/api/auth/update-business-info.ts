import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, gewerbebetreiber, umsatzsteuernummer } = await request.json();

    if (!email || typeof gewerbebetreiber !== 'boolean' || !umsatzsteuernummer) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update user with business information
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE "user"
         SET "gewerbebetreiber" = $1, "umsatzsteuernummer" = $2
         WHERE email = $3`,
        [gewerbebetreiber, umsatzsteuernummer, email]
      );

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating business info:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update business information' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
