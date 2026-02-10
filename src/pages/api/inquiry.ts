import type { APIRoute } from 'astro';
import { sendEmail } from '../../lib/email';
import { SITE_CONFIG } from '../../constants/site';
import { createFormRequest } from '../../lib/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      company,
      subject,
      message,
      formType,
      sourceUrl,
      pageTitle,
      productId,
      productName,
    } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
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

    // Subject mapping for better email subjects
    const subjectMap: Record<string, string> = {
      angebot: 'Angebot anfordern',
      beratung: 'Beratung gewünscht',
      muster: 'Muster bestellen',
      wiederverkäufer: 'Wiederverkäufer / B2B',
      technische_frage: 'Technische Frage',
      sonstiges: 'Sonstiges',
    };

    const subjectText = subjectMap[subject] || subject;

    // Create email content for admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Neue Anfrage - Selini-Shirt</title>
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

            .badge {
              display: inline-block;
              background: linear-gradient(to bottom, #595959 0%, #262626 100%);
              color: white;
              padding: 6px 14px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
              margin-right: 8px;
              margin-bottom: 10px;
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

            .action-button {
              display: inline-block;
              padding: 12px 24px;
              background: linear-gradient(to bottom, #595959 0%, #262626 100%);
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              font-size: 14px;
              font-family: 'DM Sans', sans-serif;
              margin-top: 15px;
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
              <h2>📋 Neue Anfrage erhalten</h2>

              <div style="margin-bottom: 20px;">
                <span class="badge">${subjectText}</span>
                ${pageTitle ? `<span class="badge">von: ${pageTitle}</span>` : ''}
              </div>

              <div class="field">
                <div class="label">Name</div>
                <div class="value">${name}</div>
              </div>

              <div class="field">
                <div class="label">E-Mail</div>
                <div class="value"><a href="mailto:${email}" style="color: #EBF222; text-decoration: none;">${email}</a></div>
              </div>

              ${phone ? `
              <div class="field">
                <div class="label">Telefon</div>
                <div class="value"><a href="tel:${phone}" style="color: #EBF222; text-decoration: none;">${phone}</a></div>
              </div>
              ` : ''}

              ${company ? `
              <div class="field">
                <div class="label">Firma</div>
                <div class="value">${company}</div>
              </div>
              ` : ''}

              <div class="field">
                <div class="label">Anfrage-Typ</div>
                <div class="value">${subjectText}</div>
              </div>

              ${productName ? `
              <div class="field">
                <div class="label">Produkt</div>
                <div class="value">${productName}</div>
              </div>
              ` : ''}

              <div class="field">
                <div class="label">Nachricht</div>
                <div class="value" style="white-space: pre-wrap;">${message}</div>
              </div>

              ${sourceUrl ? `
              <div class="field">
                <div class="label">Quelle</div>
                <div class="value">${sourceUrl}</div>
              </div>
              ` : ''}

              <div style="text-align: center; margin-top: 25px;">
                <a href="${SITE_CONFIG.url}/admin/anfragen" class="action-button">
                  Anfrage im Admin-Panel öffnen
                </a>
              </div>
            </div>

            <div class="footer">
              <p><strong>Selini-Shirt</strong></p>
              <p>Hochwertige Direct-to-Film Transferdruck-Dienstleistungen</p>
              <div class="divider"></div>
              <p>Diese Anfrage wurde über ${pageTitle || 'die Website'} gesendet.</p>
              <p>Antworten Sie direkt an: <a href="mailto:${email}">${email}</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const adminEmailText = `
Neue Anfrage - Selini-Shirt

Name: ${name}
E-Mail: ${email}
${phone ? `Telefon: ${phone}` : ''}
${company ? `Firma: ${company}` : ''}
Anfrage-Typ: ${subjectText}
${productName ? `Produkt: ${productName}` : ''}

Nachricht:
${message}

${sourceUrl ? `Quelle: ${sourceUrl}` : ''}

---
Selini-Shirt
Hochwertige Direct-to-Film Transferdruck-Dienstleistungen

Diese Anfrage wurde über ${pageTitle || 'die Website'} gesendet.
Antworten Sie direkt an: ${email}
    `.trim();

    // Send email to admin
    await sendEmail({
      to: SITE_CONFIG.contact.email,
      subject: `Neue Anfrage: ${subjectText} - ${name}`,
      html: adminEmailHtml,
      text: adminEmailText,
    });

    // Send confirmation email to user
    const userConfirmationHtml = `
      <!DOCTYPE html>
      <html lang="de">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Anfrage erhalten - Selini-Shirt</title>
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
              background-color: #f8f9fa;
              border-left: 4px solid #EBF222;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }

            .message-box strong {
              color: #262626;
              font-weight: 600;
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
              margin-top: 15px;
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
              <h2>✓ Vielen Dank für Ihre Anfrage!</h2>

              <p>Hallo ${name},</p>
              <p>vielen Dank für Ihre Anfrage. Wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>

              <div class="message-box">
                <p><strong>Ihre Anfrage:</strong></p>
                <p style="white-space: pre-wrap; margin: 10px 0 0 0; color: #595959;">${message}</p>
              </div>

              <p>In der Regel antworten wir innerhalb von 24 Stunden. Bei dringenden Fragen können Sie uns auch telefonisch erreichen:</p>
              <p style="text-align: center; font-size: 18px; margin: 20px 0;">
                <strong><a href="tel:${SITE_CONFIG.contact.phone}" style="color: #EBF222; text-decoration: none;">${SITE_CONFIG.contact.phone}</a></strong>
              </p>

              <p>Mit freundlichen Grüßen,<br><strong>Das Team von Selini-Shirt</strong></p>

              <div style="text-align: center;">
                <a href="${SITE_CONFIG.url}" class="button">
                  Zur Website
                </a>
              </div>
            </div>

            <div class="footer">
              <p><strong>Selini-Shirt</strong></p>
              <p>Hochwertige Direct-to-Film Transferdruck-Dienstleistungen</p>
              <div class="divider"></div>
              <p>${SITE_CONFIG.contact.email} | ${SITE_CONFIG.contact.phone}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const userConfirmationText = `
Vielen Dank für Ihre Anfrage!

Hallo ${name},

vielen Dank für Ihre Anfrage. Wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.

Ihre Anfrage:
${message}

In der Regel antworten wir innerhalb von 24 Stunden. Bei dringenden Fragen können Sie uns auch telefonisch erreichen:
${SITE_CONFIG.contact.phone}

Mit freundlichen Grüßen,
Das Team von Selini-Shirt

---
Selini-Shirt
Hochwertige Direct-to-Film Transferdruck-Dienstleistungen
${SITE_CONFIG.contact.email}
${SITE_CONFIG.contact.phone}
    `.trim();

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: 'Ihre Anfrage bei Selini-Shirt',
      html: userConfirmationHtml,
      text: userConfirmationText,
    });

    // Save request to database
    try {
      await createFormRequest({
        formType: formType || 'service_inquiry',
        name,
        email,
        phone: phone || undefined,
        subject,
        message: `${company ? `Firma: ${company}\n\n` : ''}${message}${sourceUrl ? `\n\nQuelle: ${sourceUrl} (${pageTitle})` : ''}`,
        productId: productId || undefined,
        productName: productName || undefined,
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
    } catch (dbError) {
      // Log error but don't fail the request since emails were sent successfully
      console.error('Failed to save inquiry request to database:', dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Ihre Anfrage wurde erfolgreich gesendet. Wir melden uns schnellstmöglich bei Ihnen.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Inquiry form error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
