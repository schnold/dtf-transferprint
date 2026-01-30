// Email templates for form request responses

export interface FormRequestEmailData {
  userName: string;
  userEmail: string;
  requestSubject: string;
  requestMessage: string;
  responseMessage: string;
  adminName: string;
}

// CI-conform email styles (same as order emails)
const EMAIL_STYLES = `
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
      margin: 0 0 20px 0;
    }

    .info-box {
      background-color: #f8f8f8;
      border-left: 4px solid #EBF222;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }

    .info-box p {
      margin: 0;
      color: #595959;
    }

    .info-box strong {
      color: #262626;
      display: block;
      margin-bottom: 8px;
      font-family: 'DM Sans', sans-serif;
    }

    .highlight-box {
      background: linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%);
      border: 2px solid #EBF222;
      padding: 24px;
      margin: 20px 0;
      border-radius: 12px;
    }

    .highlight-box strong {
      color: #595959;
      font-size: 18px;
      display: block;
      margin-bottom: 12px;
      font-family: 'DM Sans', sans-serif;
    }

    .highlight-box p {
      color: #262626;
      margin: 0;
      white-space: pre-wrap;
    }

    .footer {
      background-color: #f8f8f8;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }

    .footer p {
      color: #8c8c8c;
      font-size: 14px;
      margin: 5px 0;
    }

    .footer a {
      color: #EBF222;
      text-decoration: none;
    }
  </style>
`;

/**
 * Generate email for admin response to customer
 */
export function generateFormRequestResponseEmail(data: FormRequestEmailData): {
  html: string;
  text: string;
} {
  const subjectMap: Record<string, string> = {
    allgemein: 'Allgemeine Anfrage',
    beratung: 'Fachberatung',
    bestellung: 'Frage zur Bestellung',
    support: 'Technischer Support',
    b2b: 'B2B / Wiederverkäufer',
    sonstiges: 'Sonstiges',
  };

  const subjectText = subjectMap[data.requestSubject] || data.requestSubject;

  const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Antwort auf Ihre Anfrage - Selini-Shirt</title>
      ${EMAIL_STYLES}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <img src="https://selini-shirt.de/images/logo/logo-1.png" alt="Selini-Shirt Logo" class="logo" style="height: 60px; width: auto;" />
        </div>
        <div class="content">
          <h2>Hallo ${escapeHtml(data.userName)},</h2>
          <p>vielen Dank für Ihre Geduld. Hier ist die Antwort auf Ihre Anfrage:</p>

          <div class="info-box">
            <strong>Ihre ursprüngliche Nachricht:</strong>
            <p><strong>Betreff:</strong> ${escapeHtml(subjectText)}</p>
            <p style="margin-top: 8px; white-space: pre-wrap;">${escapeHtml(data.requestMessage)}</p>
          </div>

          <div class="highlight-box">
            <strong>📬 Unsere Antwort:</strong>
            <p>${escapeHtml(data.responseMessage)}</p>
          </div>

          <p>Falls Sie weitere Fragen haben, können Sie direkt auf diese E-Mail antworten oder uns jederzeit kontaktieren.</p>

          <p style="margin-top: 30px; color: #262626;">
            Mit freundlichen Grüßen,<br>
            <strong>${escapeHtml(data.adminName)}</strong><br>
            Das Team von Selini-Shirt
          </p>
        </div>
        <div class="footer">
          <p><strong>Selini-Shirt</strong></p>
          <p>
            <a href="mailto:info@selini-shirt.de">info@selini-shirt.de</a>
            &nbsp;|&nbsp;
            Tel: +49 123 456789
          </p>
          <p style="margin-top: 15px;">
            <a href="https://selini-shirt.de">selini-shirt.de</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Selini-Shirt - Antwort auf Ihre Anfrage

Hallo ${data.userName},

vielen Dank für Ihre Geduld. Hier ist die Antwort auf Ihre Anfrage:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IHRE URSPRÜNGLICHE NACHRICHT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Betreff: ${subjectText}

${data.requestMessage}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNSERE ANTWORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${data.responseMessage}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Falls Sie weitere Fragen haben, können Sie direkt auf diese E-Mail antworten oder uns jederzeit kontaktieren.

Mit freundlichen Grüßen,
${data.adminName}
Das Team von Selini-Shirt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Selini-Shirt
E-Mail: info@selini-shirt.de
Tel: +49 123 456789
Web: https://selini-shirt.de
  `.trim();

  return { html, text };
}

/**
 * Replace template variables in text
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value || '');
  });

  return result;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}
