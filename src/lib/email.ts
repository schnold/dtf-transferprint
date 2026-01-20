import { Resend } from 'resend';

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
      from: 'DTF Transfer Print <noreply@selini-shirt.de>',
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

export function generateUnsubscribeToken(userId: string): string {
  // In production, use a proper JWT or signed token
  // For now, we'll use a simple base64 encoded string
  const data = JSON.stringify({
    userId,
    timestamp: Date.now(),
  });
  return Buffer.from(data).toString('base64url');
}

export function verifyUnsubscribeToken(token: string): { userId: string } | null {
  try {
    const data = JSON.parse(Buffer.from(token, 'base64url').toString());
    // Verify token is not too old (30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (data.timestamp < thirtyDaysAgo) {
      return null;
    }
    return { userId: data.userId };
  } catch {
    return null;
  }
}
