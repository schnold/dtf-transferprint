import type { APIRoute } from 'astro';
import { sendEmail } from '../../../lib/email';
import {
  generateVerificationEmail,
  generatePasswordResetEmail,
  generateWelcomeEmail,
} from '../../../lib/email-templates';
import {
  generateOrderProcessingEmail,
  generateOrderReadyEmail,
  generateOrderShippedEmail,
  generateOrderDeliveredEmail,
} from '../../../lib/email-templates/order-status-emails';
import { generateFormRequestResponseEmail } from '../../../lib/email-templates/form-request-emails';
import { generateOrderConfirmationEmail } from '../../../lib/order-email-template';

/**
 * POST /api/admin/test-email
 * Sends a test email with the specified template
 * Admin only
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;

  // Check if user is admin
  if (!user?.isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { email, template } = await request.json();

    if (!email || !template) {
      return new Response(
        JSON.stringify({ error: 'Email und Vorlage sind erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Ungültige E-Mail-Adresse' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:4321';
    const testUserId = user.id;
    const testUserName = user.name || 'Test Benutzer';

    let emailContent: { html: string; text: string };
    let subject: string;

    // Generate email based on template type
    switch (template) {
      case 'verification':
        emailContent = generateVerificationEmail({
          userName: testUserName,
          userId: testUserId,
          baseUrl,
          verificationUrl: `${baseUrl}/auth/verify?token=TEST_TOKEN`,
        });
        subject = 'E-Mail-Bestätigung - Selini-Shirt (TEST)';
        break;

      case 'password-reset':
        emailContent = generatePasswordResetEmail({
          userName: testUserName,
          userId: testUserId,
          baseUrl,
          resetUrl: `${baseUrl}/auth/reset-password?token=TEST_TOKEN`,
        });
        subject = 'Passwort zurücksetzen - Selini-Shirt (TEST)';
        break;

      case 'welcome':
        emailContent = generateWelcomeEmail({
          userName: testUserName,
          userId: testUserId,
          baseUrl,
        });
        subject = 'Willkommen bei Selini-Shirt (TEST)';
        break;

      case 'order-confirmation':
        // Base template function for order confirmation
        const getBaseTemplate = (
          content: string,
          unsubscribeUrl: string,
          title: string = 'Selini-Shirt'
        ): string => {
          return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body>${content}</body>
</html>`;
        };

        emailContent = generateOrderConfirmationEmail(
          {
            userName: testUserName,
            userId: testUserId,
            baseUrl,
            orderNumber: 'TEST-' + Date.now(),
            orderDate: new Date().toLocaleDateString('de-DE'),
            orderTotal: '€99,99',
            orderItems: [
              { name: 'Test Produkt 1', quantity: 2, price: '€39,99' },
              { name: 'Test Produkt 2', quantity: 1, price: '€19,99' },
            ],
            subtotal: '€79,98',
            shippingCost: '€5,99',
            taxAmount: '€14,02',
            orderUrl: `${baseUrl}/orders/TEST-${Date.now()}`,
          },
          getBaseTemplate
        );
        subject = 'Bestellbestätigung - Selini-Shirt (TEST)';
        break;

      case 'order-processing':
        emailContent = generateOrderProcessingEmail({
          userName: testUserName,
          userId: testUserId,
          baseUrl,
          orderNumber: 'TEST-' + Date.now(),
          orderDate: new Date().toLocaleDateString('de-DE'),
          orderTotal: '€99,99',
          orderUrl: `${baseUrl}/orders/TEST-${Date.now()}`,
        });
        subject = 'Bestellung wird bearbeitet - Selini-Shirt (TEST)';
        break;

      case 'order-ready':
        emailContent = generateOrderReadyEmail({
          userName: testUserName,
          userId: testUserId,
          baseUrl,
          orderNumber: 'TEST-' + Date.now(),
          orderDate: new Date().toLocaleDateString('de-DE'),
          orderTotal: '€99,99',
          orderUrl: `${baseUrl}/orders/TEST-${Date.now()}`,
        });
        subject = 'Bestellung versandbereit - Selini-Shirt (TEST)';
        break;

      case 'order-shipped':
        emailContent = generateOrderShippedEmail({
          userName: testUserName,
          userId: testUserId,
          baseUrl,
          orderNumber: 'TEST-' + Date.now(),
          orderDate: new Date().toLocaleDateString('de-DE'),
          orderTotal: '€99,99',
          orderUrl: `${baseUrl}/orders/TEST-${Date.now()}`,
          trackingNumber: 'TEST123456789DE',
          trackingUrl: 'https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=TEST123456789DE',
        });
        subject = 'Bestellung versendet - Selini-Shirt (TEST)';
        break;

      case 'order-delivered':
        emailContent = generateOrderDeliveredEmail({
          userName: testUserName,
          userId: testUserId,
          baseUrl,
          orderNumber: 'TEST-' + Date.now(),
          orderDate: new Date().toLocaleDateString('de-DE'),
          orderTotal: '€99,99',
          orderUrl: `${baseUrl}/orders/TEST-${Date.now()}`,
        });
        subject = 'Bestellung zugestellt - Selini-Shirt (TEST)';
        break;

      case 'form-response':
        emailContent = generateFormRequestResponseEmail({
          userName: testUserName,
          userEmail: email,
          requestSubject: 'beratung',
          requestMessage: 'Dies ist eine Test-Anfrage für die E-Mail-Vorlage.',
          responseMessage:
            'Vielen Dank für Ihre Anfrage. Dies ist eine Test-Antwort, um die E-Mail-Vorlage zu demonstrieren.',
          adminName: user.name || 'Admin Team',
        });
        subject = 'Antwort auf Ihre Anfrage - Selini-Shirt (TEST)';
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Unbekannte Vorlage' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Send the email
    await sendEmail({
      to: email,
      subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Test-E-Mail wurde an ${email} gesendet`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Test email error:', error);
    return new Response(
      JSON.stringify({
        error: 'Fehler beim Senden der Test-E-Mail',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
