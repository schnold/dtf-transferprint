import { generateUnsubscribeToken } from "./email";

interface EmailTemplateData {
  userName: string;
  userId: string;
  baseUrl: string;
}

interface VerificationEmailData extends EmailTemplateData {
  verificationUrl: string;
}

interface PasswordResetEmailData extends EmailTemplateData {
  resetUrl: string;
}

interface OrderConfirmationEmailData extends EmailTemplateData {
  orderNumber: string;
  orderDate: string;
  orderTotal: string;
  orderItems: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  subtotal: string;
  discountAmount?: string;
  discountCode?: string;
  userDiscountPercent?: number;
  shippingCost: string;
  taxAmount: string;
  trackingUrl?: string;
  orderUrl: string;
}

// CI-conform email styles using the brand color palette
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

    .button {
      display: inline-block;
      padding: 16px 32px;
      background: linear-gradient(to bottom, #595959 0%, #262626 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      font-family: 'DM Sans', sans-serif;
      margin: 20px 0;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
    }

    .button-container {
      text-align: center;
      margin: 30px 0;
    }

    .security-notice {
      background-color: #f8f9fa;
      border-left: 4px solid #EBF222;
      padding: 15px 20px;
      margin: 25px 0;
      border-radius: 4px;
    }

    .security-notice p {
      margin: 0;
      font-size: 14px;
      color: #595959;
    }

    .info-box {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
    }

    .info-box p {
      margin: 0 0 15px 0;
    }

    .info-box p:last-child {
      margin: 0;
    }

    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #A6A6A6;
      font-size: 13px;
      border-top: 1px solid #e5e5e5;
    }

    .footer a {
      color: #EBF222;
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    .footer p {
      margin: 5px 0;
      color: #A6A6A6;
    }

    .divider {
      height: 1px;
      background-color: #e5e5e5;
      margin: 30px 0;
    }

    .link {
      color: #EBF222;
      text-decoration: none;
      word-break: break-all;
    }

    .link:hover {
      text-decoration: underline;
    }

    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }

      .header {
        padding: 30px 20px;
      }

      .header h1 {
        font-size: 24px;
      }

      .content h2 {
        font-size: 20px;
      }

      .button {
        display: block;
        text-align: center;
      }
    }
  </style>
`;

function getBaseTemplate(content: string, unsubscribeUrl: string, title: string = 'Selini-Shirt'): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>${title}</title>
      ${EMAIL_STYLES}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <img src="https://selini-shirt.de/images/logo/logo-1.webp" alt="Selini-Shirt Logo" class="logo" />
        </div>

        ${content}

        <div class="footer">
          <p><strong>Selini-Shirt</strong></p>
          <p>Hochwertige Direct-to-Film Transferdruck-Dienstleistungen</p>
          <div class="divider"></div>
          <p>
            <a href="${unsubscribeUrl}">Von E-Mails abmelden</a>
          </p>
          <p style="margin-top: 15px;">
            Diese E-Mail wurde Ihnen gesendet, weil Sie ein Konto bei Selini-Shirt erstellt haben.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generateVerificationEmail(data: VerificationEmailData): {
  html: string;
  text: string;
} {
  const unsubscribeToken = generateUnsubscribeToken(data.userId);
  const unsubscribeUrl = `${data.baseUrl}/auth/unsubscribe?token=${unsubscribeToken}`;

  const content = `
    <div class="content">
      <h2>Verifizieren Sie Ihre E-Mail-Adresse</h2>

      <p>Hallo ${data.userName},</p>

      <p>Vielen Dank für Ihre Registrierung bei Selini-Shirt! Um Ihre Registrierung abzuschließen und Ihr Konto zu nutzen, verifizieren Sie bitte Ihre E-Mail-Adresse.</p>

      <div class="button-container">
        <a href="${data.verificationUrl}" class="button">E-Mail-Adresse verifizieren</a>
      </div>

      <p>Dieser Verifizierungslink ist aus Sicherheitsgründen 24 Stunden gültig.</p>

      <div class="security-notice">
        <p><strong>🔒 Sicherheitshinweis:</strong> Wenn Sie kein Konto bei Selini-Shirt erstellt haben, können Sie diese E-Mail ignorieren.</p>
      </div>

      <div class="divider"></div>

      <p style="font-size: 14px; color: #A6A6A6;">
        Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
        <a href="${data.verificationUrl}" class="link">${data.verificationUrl}</a>
      </p>
    </div>
  `;

  const html = getBaseTemplate(content, unsubscribeUrl, 'E-Mail-Bestätigung - Selini-Shirt');

  const text = `
Hallo ${data.userName},

Vielen Dank für Ihre Registrierung bei Selini-Shirt! Um Ihre Registrierung abzuschließen und Ihr Konto zu nutzen, verifizieren Sie bitte Ihre E-Mail-Adresse.

Verifizieren Sie Ihre E-Mail, indem Sie auf diesen Link klicken:
${data.verificationUrl}

Dieser Verifizierungslink ist aus Sicherheitsgründen 24 Stunden gültig.

Sicherheitshinweis: Wenn Sie kein Konto bei Selini-Shirt erstellt haben, können Sie diese E-Mail ignorieren.

---
Selini-Shirt
Hochwertige Direct-to-Film Transferdruck-Dienstleistungen

Abmelden: ${unsubscribeUrl}
  `.trim();

  return { html, text };
}

export function generatePasswordResetEmail(data: PasswordResetEmailData): {
  html: string;
  text: string;
} {
  const unsubscribeToken = generateUnsubscribeToken(data.userId);
  const unsubscribeUrl = `${data.baseUrl}/auth/unsubscribe?token=${unsubscribeToken}`;

  const content = `
    <div class="content">
      <h2>Passwort zurücksetzen</h2>

      <p>Hallo ${data.userName},</p>

      <p>Wir haben eine Anfrage zum Zurücksetzen Ihres Passworts für Ihr Selini-Shirt Konto erhalten. Klicken Sie auf den Button unten, um ein neues Passwort zu erstellen:</p>

      <div class="button-container">
        <a href="${data.resetUrl}" class="button">Passwort zurücksetzen</a>
      </div>

      <p>Dieser Link zum Zurücksetzen des Passworts ist aus Sicherheitsgründen 1 Stunde gültig.</p>

      <div class="security-notice">
        <p><strong>🔒 Sicherheitshinweis:</strong> Wenn Sie kein Zurücksetzen des Passworts angefordert haben, ignorieren Sie diese E-Mail bitte. Ihr Passwort bleibt unverändert. Erwägen Sie eine Passwortänderung, wenn Sie Bedenken bezüglich der Kontosicherheit haben.</p>
      </div>

      <div class="divider"></div>

      <p style="font-size: 14px; color: #A6A6A6;">
        Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
        <a href="${data.resetUrl}" class="link">${data.resetUrl}</a>
      </p>

      <p style="font-size: 14px; color: #A6A6A6; margin-top: 20px;">
        Aus Sicherheitsgründen empfehlen wir:
      </p>
      <ul style="font-size: 14px; color: #A6A6A6; margin-top: 10px;">
        <li>Ein starkes, einzigartiges Passwort zu verwenden</li>
        <li>Ihr Passwort mit niemandem zu teilen</li>
        <li>Zwei-Faktor-Authentifizierung zu aktivieren (demnächst verfügbar)</li>
      </ul>
    </div>
  `;

  const html = getBaseTemplate(content, unsubscribeUrl, 'Passwort zurücksetzen - Selini-Shirt');

  const text = `
Hallo ${data.userName},

Wir haben eine Anfrage zum Zurücksetzen Ihres Passworts für Ihr Selini-Shirt Konto erhalten. Klicken Sie auf den Link unten, um ein neues Passwort zu erstellen:

${data.resetUrl}

Dieser Link zum Zurücksetzen des Passworts ist aus Sicherheitsgründen 1 Stunde gültig.

Sicherheitshinweis: Wenn Sie kein Zurücksetzen des Passworts angefordert haben, ignorieren Sie diese E-Mail bitte. Ihr Passwort bleibt unverändert.

Aus Sicherheitsgründen empfehlen wir:
- Ein starkes, einzigartiges Passwort zu verwenden
- Ihr Passwort mit niemandem zu teilen
- Zwei-Faktor-Authentifizierung zu aktivieren (demnächst verfügbar)

---
Selini-Shirt
Hochwertige Direct-to-Film Transferdruck-Dienstleistungen

Abmelden: ${unsubscribeUrl}
  `.trim();

  return { html, text };
}

export function generateWelcomeEmail(data: EmailTemplateData): {
  html: string;
  text: string;
} {
  const unsubscribeToken = generateUnsubscribeToken(data.userId);
  const unsubscribeUrl = `${data.baseUrl}/auth/unsubscribe?token=${unsubscribeToken}`;

  const content = `
    <div class="content">
      <h2>Willkommen bei Selini-Shirt!</h2>

      <p>Hallo ${data.userName},</p>

      <p>Vielen Dank für die Verifizierung Ihrer E-Mail! Ihr Konto ist jetzt vollständig aktiviert und einsatzbereit.</p>

      <p>Das können Sie als Nächstes tun:</p>

      <div class="info-box">
        <p><strong>✨ Erkunden Sie unsere Dienstleistungen</strong><br>Durchsuchen Sie unser breites Angebot an DTF-Transferdruck-Optionen</p>
        <p><strong>🎨 Laden Sie Ihre Designs hoch</strong><br>Beginnen Sie mit der Erstellung individueller Transfers mit Ihren Kunstwerken</p>
        <p><strong>📦 Verfolgen Sie Ihre Bestellungen</strong><br>Überwachen Sie alle Ihre Bestellungen über Ihr Konto-Dashboard</p>
      </div>

      <div class="button-container">
        <a href="${data.baseUrl}/products" class="button">Produkte durchsuchen</a>
      </div>

      <div class="divider"></div>

      <p style="font-size: 14px; color: #A6A6A6;">
        Benötigen Sie Hilfe beim Einstieg? Schauen Sie sich unsere <a href="${data.baseUrl}/eigenschaften" class="link">Funktionsseite</a> an oder kontaktieren Sie unser Support-Team.
      </p>
    </div>
  `;

  const html = getBaseTemplate(content, unsubscribeUrl, 'Willkommen bei Selini-Shirt');

  const text = `
Hallo ${data.userName},

Vielen Dank für die Verifizierung Ihrer E-Mail! Ihr Konto ist jetzt vollständig aktiviert und einsatzbereit.

Das können Sie als Nächstes tun:

✨ Erkunden Sie unsere Dienstleistungen
Durchsuchen Sie unser breites Angebot an DTF-Transferdruck-Optionen

🎨 Laden Sie Ihre Designs hoch
Beginnen Sie mit der Erstellung individueller Transfers mit Ihren Kunstwerken

📦 Verfolgen Sie Ihre Bestellungen
Überwachen Sie alle Ihre Bestellungen über Ihr Konto-Dashboard

Erste Schritte: ${data.baseUrl}/products

Benötigen Sie Hilfe? Besuchen Sie unsere Funktionsseite: ${data.baseUrl}/eigenschaften

---
Selini-Shirt
Hochwertige Direct-to-Film Transferdruck-Dienstleistungen

Abmelden: ${unsubscribeUrl}
  `.trim();

  return { html, text };
}
