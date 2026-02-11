import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { email, companyName, umsatzsteuernummer, gewerbebetreiber } = await request.json();
    const user = locals.user;

    // If email is provided, this is a signup flow (before auth session exists)
    // Otherwise, this is a profile update flow (requires auth)
    if (!email && !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!companyName || !umsatzsteuernummer) {
      return new Response(
        JSON.stringify({ error: 'Firmenname und Umsatzsteuer-ID sind erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate German VAT number format
    const vatRegex = /^DE[0-9]{9}$/;
    if (!vatRegex.test(umsatzsteuernummer)) {
      return new Response(
        JSON.stringify({ error: 'Ungültige Umsatzsteuer-ID. Format: DE + 9 Ziffern' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update user with business information
    const client = await pool.connect();
    try {
      if (email) {
        // Signup flow: update by email
        await client.query(
          `UPDATE "user"
           SET "companyName" = $1, "umsatzsteuernummer" = $2, "gewerbebetreiber" = $3
           WHERE email = $4`,
          [companyName, umsatzsteuernummer, gewerbebetreiber ?? false, email]
        );
      } else if (user) {
        // Profile update flow: update by user ID
        await client.query(
          `UPDATE "user"
           SET "companyName" = $1, "umsatzsteuernummer" = $2
           WHERE id = $3`,
          [companyName, umsatzsteuernummer, user.id]
        );
      }

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
      JSON.stringify({ error: 'Fehler beim Aktualisieren der Geschäftsinformationen' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
