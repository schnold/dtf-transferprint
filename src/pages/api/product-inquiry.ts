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
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || request.headers.get('cf-connecting-ip')
      || 'unknown';

    const rateLimitResult = checkRateLimit(clientIp, {
      endpoint: 'product-inquiry-form',
      maxRequests: 5,
      windowSeconds: 900,
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
    const { name, email, phone, message, productId, productName, productSlug } = body;

    // Validate required fields
    if (!name || !email || !message || !productId || !productName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bitte füllen Sie alle Pflichtfelder aus.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate name
    const nameValidation = validateTextInput(name, 'Name', INPUT_LIMITS.name);
    if (!nameValidation.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: nameValidation.error,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone if provided
    if (phone) {
      const phoneValidation = validatePhoneNumber(phone);
      if (!phoneValidation.isValid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: phoneValidation.error,
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate message
    const messageValidation = validateTextInput(message, 'Nachricht', INPUT_LIMITS.message);
    if (!messageValidation.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: messageValidation.error,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate product name
    const productNameValidation = validateTextInput(productName, 'Produktname', INPUT_LIMITS.subject);
    if (!productNameValidation.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: productNameValidation.error,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create escaped versions for HTML emails
    const nameEscaped = escapeHtml(name);
    const emailEscaped = escapeHtml(email);
    const phoneEscaped = phone ? escapeHtml(phone) : '';
    const messageEscaped = escapeHtml(message);
    const productNameEscaped = escapeHtml(productName);

    // Product URL for email
    const productUrl = `${SITE_CONFIG.url}/product/${productSlug}`;

    // Create email content for company
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Neue Produktanfrage - Selini-Shirt</title>
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

            .content h3 {
              color: #262626;
              font-size: 18px;
              font-weight: 600;
              font-family: 'DM Sans', sans-serif;
              margin: 25px 0 15px 0;
            }

            .content p {
              color: #595959;
              font-size: 16px;
              margin: 0 0 15px 0;
            }

            .product-info {
              background-color: #f8f9fa;
              border-left: 4px solid #EBF222;
              padding: 20px;
              border-radius: 8px;
              margin: 25px 0;
            }

            .product-info h3 {
              margin-top: 0;
            }

            .field {
              margin-bottom: 15px;
            }

            .label {
              font-weight: 600;
              color: #262626;
              margin-bottom: 5px;
            }

            .value {
              color: #595959;
              margin-top: 5px;
            }

            .button {
              display: inline-block;
              padding: 12px 24px;
              background: linear-gradient(to bottom, #595959 0%, #262626 100%);
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 14px;
              font-family: 'DM Sans', sans-serif;
              margin-top: 10px;
            }

            .message-box {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin-top: 5px;
              white-space: pre-wrap;
              color: #595959;
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
              <h2>Neue Produktanfrage</h2>

              <div class="product-info">
                <h3 style="margin-top: 0;">Angefragtes Produkt:</h3>
                <div class="field">
                  <div class="label">Produktname:</div>
                  <div class="value">${productNameEscaped}</div>
                </div>
                <a href="${productUrl}" class="button">Produkt ansehen</a>
              </div>

              <h3>Kundeninformationen:</h3>
              <div class="field">
                <div class="label">Name:</div>
                <div class="value">${nameEscaped}</div>
              </div>
              <div class="field">
                <div class="label">E-Mail:</div>
                <div class="value"><a href="mailto:${emailEscaped}" style="color: #EBF222; text-decoration: none;">${emailEscaped}</a></div>
              </div>
              ${phone ? `
              <div class="field">
                <div class="label">Telefon:</div>
                <div class="value">${phoneEscaped}</div>
              </div>
              ` : ''}
              <div class="field">
                <div class="label">Nachricht:</div>
                <div class="message-box">${messageEscaped}</div>
              </div>
            </div>

            <div class="footer">
              <p><strong>Selini-Shirt</strong></p>
              <p>Hochwertige Direct-to-Film Transferdruck-Dienstleistungen</p>
              <p>${SITE_CONFIG.company.shortAddress}</p>
              <p>Tel: ${SITE_CONFIG.contact.displayPhone} · <a href="mailto:${SITE_CONFIG.contact.email}">${SITE_CONFIG.contact.email}</a></p>
              <div class="divider"></div>
              <p>Diese E-Mail wurde über das Produktanfrage-Formular auf selini-shirt.de gesendet.</p>
              <p>Antworten Sie direkt an: <a href="mailto:${emailEscaped}">${emailEscaped}</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
Neue Produktanfrage - Selini-Shirt

Angefragtes Produkt:
${productName}
Produkt-Link: ${productUrl}

---

Kundeninformationen:
Name: ${name}
E-Mail: ${email}
${phone ? `Telefon: ${phone}` : ''}

Nachricht:
${message}

---
Selini-Shirt
Hochwertige Direct-to-Film Transferdruck-Dienstleistungen
${SITE_CONFIG.company.shortAddress}
Tel: ${SITE_CONFIG.contact.displayPhone} · E-Mail: ${SITE_CONFIG.contact.email}

Diese E-Mail wurde über das Produktanfrage-Formular auf selini-shirt.de gesendet.
Antworten Sie direkt an: ${email}
    `.trim();

    // Send email to company (use unescaped for subject line)
    await sendEmail({
      to: SITE_CONFIG.contact.email,
      subject: `Produktanfrage: ${productName} - ${name}`,
      html: emailHtml,
      text: emailText,
    });

    // Send confirmation email to customer
    const confirmationHtml = `
      <!DOCTYPE html>
      <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Produktanfrage erhalten - Selini-Shirt</title>
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

            .product-box {
              background-color: #f8f9fa;
              border-left: 4px solid #EBF222;
              padding: 20px;
              border-radius: 8px;
              margin: 25px 0;
            }

            .product-box strong {
              color: #262626;
              font-weight: 600;
            }

            .message-box {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              white-space: pre-wrap;
              color: #595959;
              margin-top: 10px;
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
              <h2>Vielen Dank für Ihre Produktanfrage!</h2>

              <p>Hallo ${nameEscaped},</p>
              <p>vielen Dank für Ihr Interesse an unserem Produkt. Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>

              <div class="product-box">
                <strong>Angefragtes Produkt:</strong><br>
                ${productNameEscaped}
              </div>

              <p><strong>Ihre Nachricht:</strong></p>
              <div class="message-box">${messageEscaped}</div>

              <p>In der Zwischenzeit können Sie gerne unser komplettes Produktsortiment durchstöbern oder bei weiteren Fragen direkt Kontakt mit uns aufnehmen.</p>

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
Vielen Dank für Ihre Produktanfrage!

Hallo ${name},

vielen Dank für Ihr Interesse an unserem Produkt. Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden.

Angefragtes Produkt:
${productName}

Ihre Nachricht:
${message}

In der Zwischenzeit können Sie gerne unser komplettes Produktsortiment durchstöbern oder bei weiteren Fragen direkt Kontakt mit uns aufnehmen.

Mit freundlichen Grüßen,
Das Team von Selini-Shirt

---
Selini-Shirt
Hochwertige Direct-to-Film Transferdruck-Dienstleistungen
${SITE_CONFIG.company.shortAddress}
Tel: ${SITE_CONFIG.contact.displayPhone} · E-Mail: ${SITE_CONFIG.contact.email}
    `.trim();

    // Send confirmation email to customer (use unescaped for subject line and 'to' field)
    await sendEmail({
      to: email,
      subject: `Ihre Produktanfrage: ${productName}`,
      html: confirmationHtml,
      text: confirmationText,
    });

    // Save inquiry to database
    try {
      await createFormRequest({
        formType: 'produktanfrage',
        name,
        email,
        phone: phone || undefined,
        subject: 'Produktanfrage',
        message,
        productId,
        productName,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
    } catch (dbError) {
      // Log error but don't fail the request since emails were sent successfully
      console.error('Failed to save product inquiry to database:', dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Ihre Produktanfrage wurde erfolgreich gesendet. Wir melden uns schnellstmöglich bei Ihnen.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Product inquiry error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
