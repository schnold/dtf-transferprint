import type { APIRoute } from 'astro';
import { sendEmail } from '../../lib/email';
import { SITE_CONFIG } from '../../constants/site';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

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
      allgemein: 'Allgemeine Anfrage',
      beratung: 'Fachberatung',
      bestellung: 'Frage zur Bestellung',
      support: 'Technischer Support',
      b2b: 'B2B / Wiederverkäufer',
      sonstiges: 'Sonstiges',
    };

    const subjectText = subjectMap[subject] || subject;

    // Create email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .content { background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #555; }
            .value { margin-top: 5px; color: #333; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Neue Kontaktanfrage von ${name}</h2>
            </div>
            <div class="content">
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
                <div class="label">Betreff:</div>
                <div class="value">${subjectText}</div>
              </div>
              <div class="field">
                <div class="label">Nachricht:</div>
                <div class="value" style="white-space: pre-wrap;">${message}</div>
              </div>
            </div>
            <div class="footer">
              <p>Diese E-Mail wurde über das Kontaktformular auf dtf-transferprint.de gesendet.</p>
              <p>Antworten Sie direkt an: <a href="mailto:${email}">${email}</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
Neue Kontaktanfrage von ${name}

Name: ${name}
E-Mail: ${email}
${phone ? `Telefon: ${phone}` : ''}
Betreff: ${subjectText}

Nachricht:
${message}

---
Diese E-Mail wurde über das Kontaktformular auf dtf-transferprint.de gesendet.
Antworten Sie direkt an: ${email}
    `.trim();

    // Send email to company
    await sendEmail({
      to: SITE_CONFIG.contact.email,
      subject: `Kontaktanfrage: ${subjectText} - ${name}`,
      html: emailHtml,
      text: emailText,
    });

    // Send confirmation email to user
    const confirmationHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; text-align: center; }
            .content { background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #777; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Vielen Dank für Ihre Nachricht!</h2>
            </div>
            <div class="content">
              <p>Hallo ${name},</p>
              <p>vielen Dank für Ihre Kontaktanfrage. Wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>
              <p><strong>Ihre Anfrage:</strong></p>
              <p style="background: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${message}</p>
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
Vielen Dank für Ihre Nachricht!

Hallo ${name},

vielen Dank für Ihre Kontaktanfrage. Wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.

Ihre Anfrage:
${message}

Mit freundlichen Grüßen,
Das Team von DTF Transfer Print

DTF Transfer Print
${SITE_CONFIG.contact.email}
${SITE_CONFIG.contact.phone}
    `.trim();

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: 'Ihre Kontaktanfrage bei DTF Transfer Print',
      html: confirmationHtml,
      text: confirmationText,
    });

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
