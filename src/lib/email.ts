import { Resend } from 'resend';
import { createHmac, randomBytes } from 'crypto';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (resend) {
    return resend;
  }

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      '⚠️  RESEND_API_KEY not configured. Emails will be logged to console only.'
    );
    console.warn(
      '   Add RESEND_API_KEY to .env to enable email sending.'
    );
  }

  // Create Resend client (will still work for logging even without API key)
  resend = new Resend(apiKey);
  return resend;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  // If API key is not configured, just log in development
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.log('\n📧 Email Content (Resend API not configured):');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('Text:', options.text);
      console.log('\n');
    }
    return;
  }

  const resendClient = getResendClient();

  try {
    const { data, error } = await resendClient.emails.send({
      from: 'DTF Transfer Print <noreply@info.selini-shirt.de>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      // Add List-Unsubscribe header for email clients
      headers: {
        'List-Unsubscribe': `<${process.env.BETTER_AUTH_URL}/auth/unsubscribe>`,
      },
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      throw error;
    }

    console.log('✅ Email sent successfully via Resend:', data?.id);
  } catch (error) {
    console.error('❌ Failed to send email:', error);

    // In development, log the email content for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('\n📧 Email Content (not sent due to error):');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('Text:', options.text);
      console.log('\n');
    }

    // Only throw in production to prevent signup failures in development
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

/**
 * Generate a cryptographically secure unsubscribe token using HMAC-SHA256
 * Format: base64url(data + "." + signature)
 */
export function generateUnsubscribeToken(userId: string): string {
  const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error('UNSUBSCRIBE_TOKEN_SECRET or BETTER_AUTH_SECRET must be configured');
  }

  const data = JSON.stringify({
    userId,
    timestamp: Date.now(),
    nonce: randomBytes(16).toString('hex'), // Add randomness to prevent token prediction
  });

  // Create HMAC signature
  const signature = createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  // Combine data and signature
  const token = Buffer.from(`${data}.${signature}`).toString('base64url');
  return token;
}

/**
 * Verify an unsubscribe token's authenticity and freshness
 * Returns userId if valid, null otherwise
 */
export function verifyUnsubscribeToken(token: string): { userId: string } | null {
  try {
    const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET;

    if (!secret) {
      console.error('UNSUBSCRIBE_TOKEN_SECRET or BETTER_AUTH_SECRET not configured');
      return null;
    }

    // Decode the token
    const decoded = Buffer.from(token, 'base64url').toString();
    const [dataStr, receivedSignature] = decoded.split('.');

    if (!dataStr || !receivedSignature) {
      return null;
    }

    // Verify signature
    const expectedSignature = createHmac('sha256', secret)
      .update(dataStr)
      .digest('hex');

    // Use timing-safe comparison
    if (!timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature))) {
      console.warn('[SECURITY] Invalid unsubscribe token signature detected');
      return null;
    }

    // Parse and validate data
    const data = JSON.parse(dataStr);

    // Verify token is not too old (30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (data.timestamp < thirtyDaysAgo) {
      return null;
    }

    return { userId: data.userId };
  } catch (error) {
    // Don't log the actual token or error details for security
    console.warn('[SECURITY] Failed to verify unsubscribe token');
    return null;
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}
