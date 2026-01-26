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
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
            .header h2 { margin: 0; font-size: 24px; }
            .content { background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            .field { margin-bottom: 20px; background: #f9f9f9; padding: 15px; border-radius: 5px; }
            .label { font-weight: bold; color: #667eea; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .value { margin-top: 5px; color: #333; font-size: 16px; }
            .badge { display: inline-block; background: #667eea; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-bottom: 10px; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; text-align: center; }
            .action-button { display: inline-block; background: #667eea; color: white !important; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: 600; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📋 Neue Anfrage erhalten</h2>
            </div>
            <div class="content">
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
                <div class="value"><a href="mailto:${email}" style="color: #667eea;">${email}</a></div>
              </div>

              ${phone ? `
              <div class="field">
                <div class="label">Telefon</div>
                <div class="value"><a href="tel:${phone}" style="color: #667eea;">${phone}</a></div>
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
                <a href="${SITE_CONFIG.url}/admin/inquiries" class="action-button">
                  Anfrage im Admin-Panel öffnen
                </a>
              </div>
            </div>
            <div class="footer">
              <p>Diese Anfrage wurde über ${pageTitle || 'die Website'} gesendet.</p>
              <p>Antworten Sie direkt an: <a href="mailto:${email}" style="color: #667eea;">${email}</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const adminEmailText = `
Neue Anfrage von ${name}

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
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
            .header h2 { margin: 0; font-size: 24px; }
            .content { background: #fff; padding: 30px; border: 1px solid #ddd; border-radius: 5px; }
            .message-box { background: #f9f9f9; padding: 20px; border-radius: 5px; border-left: 4px solid #667eea; margin: 20px 0; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; text-align: center; }
            .button { display: inline-block; background: #667eea; color: white !important; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: 600; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>✓ Vielen Dank für Ihre Anfrage!</h2>
            </div>
            <div class="content">
              <p>Hallo ${name},</p>
              <p>vielen Dank für Ihre Anfrage. Wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>

              <div class="message-box">
                <p><strong>Ihre Anfrage:</strong></p>
                <p style="white-space: pre-wrap; margin: 10px 0 0 0;">${message}</p>
              </div>

              <p>In der Regel antworten wir innerhalb von 24 Stunden. Bei dringenden Fragen können Sie uns auch telefonisch erreichen:</p>
              <p style="text-align: center; font-size: 18px; margin: 20px 0;">
                <strong><a href="tel:${SITE_CONFIG.contact.phone}" style="color: #667eea; text-decoration: none;">${SITE_CONFIG.contact.phone}</a></strong>
              </p>

              <p>Mit freundlichen Grüßen,<br><strong>Das Team von DTF Transfer Print</strong></p>

              <div style="text-align: center;">
                <a href="${SITE_CONFIG.url}" class="button">
                  Zur Website
                </a>
              </div>
            </div>
            <div class="footer">
              <p><strong>DTF Transfer Print</strong></p>
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
Das Team von DTF Transfer Print

---
DTF Transfer Print
${SITE_CONFIG.contact.email}
${SITE_CONFIG.contact.phone}
    `.trim();

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: 'Ihre Anfrage bei DTF Transfer Print',
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
