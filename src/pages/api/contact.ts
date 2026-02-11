import type { APIRoute } from 'astro';
import { sendEmail } from '../../lib/email';
import { SITE_CONFIG } from '../../constants/site';
import { createFormRequest } from '../../lib/db';
import {
  escapeHtml,
  validateTextInput,
  isValidEmail,
  validatePhoneNumber,
  INPUT_LIMITS,
} from '../../lib/security';
import { checkRateLimit, getRateLimitHeaders } from '../../lib/rate-limiter';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limiting: 5 submissions per 15 minutes per IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || request.headers.get('cf-connecting-ip')
      || 'unknown';

    const rateLimitResult = checkRateLimit(clientIp, {
      endpoint: 'contact-form',
      maxRequests: 5,
      windowSeconds: 900, // 15 minutes
    });

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...getRateLimitHeaders(rateLimitResult)
          }
        }
      );
    }

    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    // Validate required fields exist
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bitte füllen Sie alle Pflichtfelder aus.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize input with length limits
    let validatedName: string;
    let validatedEmail: string;
    let validatedPhone: string = '';
    let validatedSubject: string;
    let validatedMessage: string;

    try {
      validatedName = validateTextInput(name, INPUT_LIMITS.NAME_MAX, 'Name');
      validatedEmail = email.trim();

      if (!isValidEmail(validatedEmail)) {
        throw new Error('Ungültige E-Mail-Adresse');
      }

      if (phone) {
        validatedPhone = validatePhoneNumber(phone);
      }

      validatedSubject = validateTextInput(subject, INPUT_LIMITS.SUBJECT_MAX, 'Betreff');
      validatedMessage = validateTextInput(message, INPUT_LIMITS.MESSAGE_MAX, 'Nachricht');
    } catch (validationError: any) {
      return new Response(
        JSON.stringify({
          success: false,
          error: validationError.message || 'Ungültige Eingabe',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Subject mapping for better email subjects
    const subjectMap: Record<string, string> = {
      allgemein: 'Allgemeine Anfrage',
      beratung: 'Fachberatung',
      bestellung: 'Frage zur Bestellung',
      support: 'Technischer Support',
      b2b: 'B2B / Wiederverkäufer',
      sonstiges: 'Sonstiges',
    };

    const subjectText = subjectMap[validatedSubject] || validatedSubject;

    // Escape all user input for HTML emails to prevent XSS
    const nameEscaped = escapeHtml(validatedName);
    const emailEscaped = escapeHtml(validatedEmail);
    const phoneEscaped = escapeHtml(validatedPhone);
    const subjectEscaped = escapeHtml(subjectText);
    const messageEscaped = escapeHtml(validatedMessage);

    // Create email content
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Neue Kontaktanfrage - Selini-Shirt</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');

            body {
              margin: 0;
              padding: 0;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f2f2f2;
            }

            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }

            .header {
              background: linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%);
              padding: 40px 30px;
              text-align: center;
            }

            .header img.logo {
              height: 60px;
              width: auto;
            }

            .content {
              padding: 40px 30px;
              color: #595959;
              line-height: 1.6;
            }

            .content h2 {
              color: #262626;
              font-size: 24px;
              font-weight: 600;
              font-family: 'DM Sans', sans-serif;
              margin: 0 0 20px 0;
            }

            .field {
              margin-bottom: 20px;
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
            }

            .label {
              font-weight: 600;
              color: #262626;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
            }

            .value {
              margin-top: 5px;
              color: #595959;
              font-size: 16px;
            }

            .footer {
              background-color: #f8f9fa;
              padding: 30px;
              text-align: center;
              color: #A6A6A6;
              font-size: 13px;
              border-top: 1px solid #e5e5e5;
            }

            .footer p {
              margin: 5px 0;
            }

            .footer a {
              color: #EBF222;
              text-decoration: none;
            }

            .divider {
              height: 1px;
              background-color: #e5e5e5;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <img src="${SITE_CONFIG.brand.logo.headerUrl}" alt="${SITE_CONFIG.brand.logo.alt}" class="logo" />
            </div>

            <div class="content">
              <h2>Neue Kontaktanfrage von ${nameEscaped}</h2>

              <div class="field">
                <div class="label">Name</div>
                <div class="value">${nameEscaped}</div>
              </div>

              <div class="field">
                <div class="label">E-Mail</div>
                <div class="value"><a href="mailto:${emailEscaped}" style="color: #EBF222; text-decoration: none;">${emailEscaped}</a></div>
              </div>

              ${validatedPhone ? `
              <div class="field">
                <div class="label">Telefon</div>
                <div class="value">${phoneEscaped}</div>
              </div>
              ` : ''}

              <div class="field">
                <div class="label">Betreff</div>
                <div class="value">${subjectEscaped}</div>
              </div>

              <div class="field">
                <div class="label">Nachricht</div>
                <div class="value" style="white-space: pre-wrap;">${messageEscaped}</div>
              </div>
            </div>

            <div class="footer">
              <p><strong>Selini-Shirt</strong></p>
              <p>Hochwertige Direct-to-Film Transferdruck-Dienstleistungen</p>
              <p>${SITE_CONFIG.company.shortAddress}</p>
              <p>Tel: ${SITE_CONFIG.contact.displayPhone} · <a href="mailto:${SITE_CONFIG.contact.email}">${SITE_CONFIG.contact.email}</a></p>
              <div class="divider"></div>
              <p>Diese E-Mail wurde über das Kontaktformular auf selini-shirt.de gesendet.</p>
              <p>Antworten Sie direkt an: <a href="mailto:${emailEscaped}">${emailEscaped}</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
Neue Kontaktanfrage - Selini-Shirt

Name: ${validatedName}
E-Mail: ${validatedEmail}
${validatedPhone ? `Telefon: ${validatedPhone}` : ''}
Betreff: ${subjectText}

Nachricht:
${validatedMessage}

---
Selini-Shirt
Hochwertige Direct-to-Film Transferdruck-Dienstleistungen
${SITE_CONFIG.company.shortAddress}
Tel: ${SITE_CONFIG.contact.displayPhone} · E-Mail: ${SITE_CONFIG.contact.email}

Diese E-Mail wurde über das Kontaktformular auf selini-shirt.de gesendet.
Antworten Sie direkt an: ${validatedEmail}
    `.trim();

    // Send email to company
    await sendEmail({
      to: SITE_CONFIG.contact.email,
      subject: `Kontaktanfrage: ${subjectText} - ${validatedName}`,
      html: emailHtml,
      text: emailText,
    });

    // Send confirmation email to user
    const confirmationHtml = `
      <!DOCTYPE html>
      <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Kontaktanfrage erhalten - Selini-Shirt</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');

            body {
              margin: 0;
              padding: 0;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background-color: #f2f2f2;
            }

            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
            }

            .header {
              background: linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%);
              padding: 40px 30px;
              text-align: center;
            }

            .header img.logo {
              height: 60px;
              width: auto;
            }

            .content {
              padding: 40px 30px;
              color: #595959;
              line-height: 1.6;
            }

            .content h2 {
              color: #262626;
              font-size: 24px;
              font-weight: 600;
              font-family: 'DM Sans', sans-serif;
              margin: 0 0 20px 0;
            }

            .content p {
              color: #595959;
              font-size: 16px;
              margin: 0 0 15px 0;
            }

            .message-box {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              white-space: pre-wrap;
              color: #595959;
              margin: 15px 0;
            }

            .footer {
              background-color: #f8f9fa;
              padding: 30px;
              text-align: center;
              color: #A6A6A6;
              font-size: 13px;
              border-top: 1px solid #e5e5e5;
            }

            .footer p {
              margin: 5px 0;
            }

            .divider {
              height: 1px;
              background-color: #e5e5e5;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <img src="${SITE_CONFIG.brand.logo.headerUrl}" alt="${SITE_CONFIG.brand.logo.alt}" class="logo" />
            </div>

            <div class="content">
              <h2>Vielen Dank für Ihre Nachricht!</h2>

              <p>Hallo ${nameEscaped},</p>
              <p>vielen Dank für Ihre Kontaktanfrage. Wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>

              <p><strong>Ihre Anfrage:</strong></p>
              <div class="message-box">${messageEscaped}</div>

              <p>Mit freundlichen Grüßen,<br><strong>Das Team von Selini-Shirt</strong></p>
            </div>

            <div class="footer">
              <p><strong>Selini-Shirt</strong></p>
              <p>Hochwertige Direct-to-Film Transferdruck-Dienstleistungen</p>
              <p>${SITE_CONFIG.company.shortAddress}</p>
              <p>Tel: ${SITE_CONFIG.contact.displayPhone} · <a href="mailto:${SITE_CONFIG.contact.email}">${SITE_CONFIG.contact.email}</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const confirmationText = `
Vielen Dank für Ihre Nachricht!

Hallo ${validatedName},

vielen Dank für Ihre Kontaktanfrage. Wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.

Ihre Anfrage:
${validatedMessage}

Mit freundlichen Grüßen,
Das Team von Selini-Shirt

---
Selini-Shirt
Hochwertige Direct-to-Film Transferdruck-Dienstleistungen
${SITE_CONFIG.company.shortAddress}
Tel: ${SITE_CONFIG.contact.displayPhone} · E-Mail: ${SITE_CONFIG.contact.email}
    `.trim();

    // Send confirmation email to user
    await sendEmail({
      to: validatedEmail,
      subject: 'Ihre Kontaktanfrage bei Selini-Shirt',
      html: confirmationHtml,
      text: confirmationText,
    });

    // Save request to database
    try {
      await createFormRequest({
        formType: 'contact',
        name: validatedName,
        email: validatedEmail,
        phone: validatedPhone || undefined,
        subject: validatedSubject,
        message: validatedMessage,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
    } catch (dbError) {
      // Log error but don't fail the request since emails were sent successfully
      console.error('Failed to save contact request to database:', dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Ihre Nachricht wurde erfolgreich gesendet. Wir melden uns schnellstmöglich bei Ihnen.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
