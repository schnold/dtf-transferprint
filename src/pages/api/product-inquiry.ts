import type { APIRoute } from 'astro';
import { sendEmail } from '../../lib/email';
import { SITE_CONFIG } from '../../constants/site';
import { createFormRequest } from '../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Product URL for email
    const productUrl = `${SITE_CONFIG.url}/product/${productSlug}`;

    // Create email content for company
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #555; }
            .value { margin-top: 5px; color: #333; }
            .product-info { background: #f0f4ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; text-align: center; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Neue Produktanfrage</h2>
            </div>
            <div class="content">
              <div class="product-info">
                <h3 style="margin-top: 0;">Angefragtes Produkt:</h3>
                <div class="field">
                  <div class="label">Produktname:</div>
                  <div class="value">${productName}</div>
                </div>
                <div class="field">
                  <a href="${productUrl}" class="button">Produkt ansehen</a>
                </div>
              </div>

              <h3>Kundeninformationen:</h3>
              <div class="field">
                <div class="label">Name:</div>
                <div class="value">${name}</div>
              </div>
              <div class="field">
                <div class="label">E-Mail:</div>
                <div class="value"><a href="mailto:${email}">${email}</a></div>
              </div>
              ${phone ? `
              <div class="field">
                <div class="label">Telefon:</div>
                <div class="value">${phone}</div>
              </div>
              ` : ''}
              <div class="field">
                <div class="label">Nachricht:</div>
                <div class="value" style="white-space: pre-wrap; background: #f9f9f9; padding: 15px; border-radius: 5px;">${message}</div>
              </div>
            </div>
            <div class="footer">
              <p>Diese E-Mail wurde über das Produktanfrage-Formular auf dtf-transferprint.de gesendet.</p>
              <p>Antworten Sie direkt an: <a href="mailto:${email}">${email}</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
Neue Produktanfrage

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
Diese E-Mail wurde über das Produktanfrage-Formular auf dtf-transferprint.de gesendet.
Antworten Sie direkt an: ${email}
    `.trim();

    // Send email to company
    await sendEmail({
      to: SITE_CONFIG.contact.email,
      subject: `Produktanfrage: ${productName} - ${name}`,
      html: emailHtml,
      text: emailText,
    });

    // Send confirmation email to customer
    const confirmationHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; }
            .product-box { background: #f0f4ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Vielen Dank für Ihre Produktanfrage!</h2>
            </div>
            <div class="content">
              <p>Hallo ${name},</p>
              <p>vielen Dank für Ihr Interesse an unserem Produkt. Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>

              <div class="product-box">
                <strong>Angefragtes Produkt:</strong><br>
                ${productName}
              </div>

              <p><strong>Ihre Nachricht:</strong></p>
              <p style="background: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${message}</p>

              <p>In der Zwischenzeit können Sie gerne unser komplettes Produktsortiment durchstöbern oder bei weiteren Fragen direkt Kontakt mit uns aufnehmen.</p>

              <p>Mit freundlichen Grüßen,<br>Das Team von DTF Transfer Print</p>
            </div>
            <div class="footer">
              <p>DTF Transfer Print | ${SITE_CONFIG.contact.email} | ${SITE_CONFIG.contact.phone}</p>
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
Das Team von DTF Transfer Print

DTF Transfer Print
${SITE_CONFIG.contact.email}
${SITE_CONFIG.contact.phone}
    `.trim();

    // Send confirmation email to customer
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
