import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';
import { createHash, createHmac } from 'crypto';

function anonymizeIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts.slice(0, 4).join(':')}::`;
  }
  return 'unknown';
}

/**
 * API endpoint to save cookie consent preferences
 * Saves to user table if logged in, or cookieConsents table for guests
 * GDPR/TTDSG compliant
 */
export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
	try {
		const body = await request.json();
		const { consent, version, userId } = body;

		// Validate consent object
		if (!consent || typeof consent !== 'object') {
			return new Response(
				JSON.stringify({ error: 'Invalid consent data' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const client = await pool.connect();

		try {
			if (userId && locals.user?.id === userId) {
				// Logged-in user: Save to user table
				await client.query(
					`UPDATE "user" 
					SET "cookieConsent" = $1, 
						"cookieConsentDate" = CURRENT_TIMESTAMP,
						"cookieConsentVersion" = $2
					WHERE id = $3`,
					[JSON.stringify(consent), version || '1.0', userId]
				);
			} else {
				// Guest user: Save to cookieConsents table
				const userAgent = request.headers.get('user-agent') || 'unknown';
				const ipAddress = clientAddress || 'unknown';
				const anonymizedIp = anonymizeIp(ipAddress);
				const consentSecret =
					process.env.COOKIE_CONSENT_HASH_SECRET ||
					process.env.BETTER_AUTH_SECRET ||
					'dev-cookie-consent-secret';
				const userAgentHash = createHash('sha256').update(userAgent).digest('hex');
				const sessionId = `consent_${createHmac('sha256', consentSecret)
					.update(`${anonymizedIp}|${userAgentHash}`)
					.digest('hex')}`;

				// Check if consent already exists for this session
				const existingConsent = await client.query(
					`SELECT id FROM "cookieConsents" WHERE "sessionId" = $1`,
					[sessionId]
				);

				if (existingConsent.rows.length > 0) {
					// Update existing consent
					await client.query(
						`UPDATE "cookieConsents" 
						SET "consentData" = $1, 
							"consentVersion" = $2,
							"updatedAt" = CURRENT_TIMESTAMP
						WHERE "sessionId" = $3`,
						[JSON.stringify(consent), version || '1.0', sessionId]
					);
				} else {
					// Insert new consent
					await client.query(
						`INSERT INTO "cookieConsents" 
						("sessionId", "ipAddress", "userAgent", "consentData", "consentVersion")
						VALUES ($1, $2, $3, $4, $5)`,
						[sessionId, anonymizedIp, userAgentHash, JSON.stringify(consent), version || '1.0']
					);
				}
			}

			return new Response(
				JSON.stringify({ success: true }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		} finally {
			client.release();
		}
	} catch (error) {
		console.error('Error saving cookie consent:', error);
		return new Response(
			JSON.stringify({ error: 'Internal server error' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
