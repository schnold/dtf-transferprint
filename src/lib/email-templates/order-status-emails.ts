import { generateUnsubscribeToken } from "../email";

interface BaseOrderEmailData {
  userName: string;
  userId: string;
  baseUrl: string;
  orderNumber: string;
  orderDate: string;
  orderTotal: string;
  orderUrl: string;
}

interface ShippedOrderEmailData extends BaseOrderEmailData {
  trackingNumber: string;
  trackingUrl: string;
}

// CI-conform email styles (same as main email templates)
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
      background: linear-gradient(135deg, #D95829 0%, #C04A1F 100%);
      padding: 40px 30px;
      text-align: center;
    }

    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      font-family: 'DM Sans', sans-serif;
      letter-spacing: -0.5px;
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

    .button-primary {
      background: linear-gradient(135deg, #D95829 0%, #C04A1F 100%);
    }

    .button-container {
      text-align: center;
      margin: 30px 0;
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

    .tracking-box {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 2px solid #D95829;
      padding: 25px;
      border-radius: 12px;
      margin: 25px 0;
      text-align: center;
    }

    .tracking-box h3 {
      color: #262626;
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 15px 0;
      font-family: 'DM Sans', sans-serif;
    }

    .tracking-number {
      background-color: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 18px;
      font-weight: 600;
      color: #262626;
      margin: 15px 0;
      letter-spacing: 1px;
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
      color: #D95829;
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
      color: #D95829;
      text-decoration: none;
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
      .button {
        padding: 14px 24px;
        font-size: 15px;
      }
    }
  </style>
`;

function getBaseTemplate(content: string, unsubscribeUrl: string): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>DTF Transfer Print</title>
      ${EMAIL_STYLES}
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>DTF Transfer Print</h1>
        </div>

        ${content}

        <div class="footer">
          <p><strong>DTF Transfer Print</strong></p>
          <p>Hochwertige Direct-to-Film Transferdruck-Dienstleistungen</p>
          <div class="divider"></div>
          <p>
            <a href="${unsubscribeUrl}">Von E-Mails abmelden</a>
          </p>
          <p style="margin-top: 15px;">
            Diese E-Mail wurde Ihnen gesendet, weil Sie eine Bestellung bei DTF Transfer Print aufgegeben haben.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Order Processing Email (In Bearbeitung)
export function generateOrderProcessingEmail(data: BaseOrderEmailData): {
  html: string;
  text: string;
} {
  const unsubscribeToken = generateUnsubscribeToken(data.userId);
  const unsubscribeUrl = `${data.baseUrl}/auth/unsubscribe?token=${unsubscribeToken}`;

  const content = `
    <div class="content">
      <h2>Ihre Bestellung wird bearbeitet</h2>

      <p>Hallo ${data.userName},</p>

      <p>Gute Nachrichten! Wir haben mit der Bearbeitung Ihrer Bestellung begonnen.</p>

      <div class="info-box">
        <p><strong>Bestellnummer:</strong> ${data.orderNumber}</p>
        <p><strong>Bestelldatum:</strong> ${data.orderDate}</p>
        <p><strong>Gesamtbetrag:</strong> ${data.orderTotal}</p>
      </div>

      <p>Wir bereiten Ihre Artikel sorgfältig für den Versand vor. Sie erhalten eine weitere E-Mail, sobald Ihre Bestellung versandbereit ist.</p>

      <div class="button-container">
        <a href="${data.orderUrl}" class="button">Bestellung ansehen</a>
      </div>

      <p>Bei Fragen zu Ihrer Bestellung können Sie uns jederzeit kontaktieren.</p>
    </div>
  `;

  const html = getBaseTemplate(content, unsubscribeUrl);

  const text = `
DTF Transfer Print
Ihre Bestellung wird bearbeitet

Hallo ${data.userName},

Gute Nachrichten! Wir haben mit der Bearbeitung Ihrer Bestellung begonnen.

Bestelldetails:
Bestellnummer: ${data.orderNumber}
Bestelldatum: ${data.orderDate}
Gesamtbetrag: ${data.orderTotal}

Wir bereiten Ihre Artikel sorgfältig für den Versand vor. Sie erhalten eine weitere E-Mail, sobald Ihre Bestellung versandbereit ist.

Bestellung ansehen: ${data.orderUrl}

Bei Fragen zu Ihrer Bestellung können Sie uns jederzeit kontaktieren.

---
DTF Transfer Print
Hochwertige Direct-to-Film Transferdruck-Dienstleistungen

Abmelden: ${unsubscribeUrl}
`;

  return { html, text };
}

// Order Ready Email (Versandfertig)
export function generateOrderReadyEmail(data: BaseOrderEmailData): {
  html: string;
  text: string;
} {
  const unsubscribeToken = generateUnsubscribeToken(data.userId);
  const unsubscribeUrl = `${data.baseUrl}/auth/unsubscribe?token=${unsubscribeToken}`;

  const content = `
    <div class="content">
      <h2>Ihre Bestellung ist versandbereit</h2>

      <p>Hallo ${data.userName},</p>

      <p>Ihre Bestellung wurde erfolgreich vorbereitet und ist nun versandbereit!</p>

      <div class="info-box">
        <p><strong>Bestellnummer:</strong> ${data.orderNumber}</p>
        <p><strong>Bestelldatum:</strong> ${data.orderDate}</p>
        <p><strong>Gesamtbetrag:</strong> ${data.orderTotal}</p>
      </div>

      <p>Ihre Artikel sind verpackt und werden in Kürze an unseren Versanddienstleister übergeben. Sie erhalten eine Tracking-Nummer, sobald das Paket unterwegs ist.</p>

      <div class="button-container">
        <a href="${data.orderUrl}" class="button">Bestellung ansehen</a>
      </div>

      <p>Vielen Dank für Ihr Vertrauen in DTF Transfer Print!</p>
    </div>
  `;

  const html = getBaseTemplate(content, unsubscribeUrl);

  const text = `
DTF Transfer Print
Ihre Bestellung ist versandbereit

Hallo ${data.userName},

Ihre Bestellung wurde erfolgreich vorbereitet und ist nun versandbereit!

Bestelldetails:
Bestellnummer: ${data.orderNumber}
Bestelldatum: ${data.orderDate}
Gesamtbetrag: ${data.orderTotal}

Ihre Artikel sind verpackt und werden in Kürze an unseren Versanddienstleister übergeben. Sie erhalten eine Tracking-Nummer, sobald das Paket unterwegs ist.

Bestellung ansehen: ${data.orderUrl}

Vielen Dank für Ihr Vertrauen in DTF Transfer Print!

---
DTF Transfer Print
Hochwertige Direct-to-Film Transferdruck-Dienstleistungen

Abmelden: ${unsubscribeUrl}
`;

  return { html, text };
}

// Order Shipped Email (Versendet)
export function generateOrderShippedEmail(data: ShippedOrderEmailData): {
  html: string;
  text: string;
} {
  const unsubscribeToken = generateUnsubscribeToken(data.userId);
  const unsubscribeUrl = `${data.baseUrl}/auth/unsubscribe?token=${unsubscribeToken}`;

  const content = `
    <div class="content">
      <h2>📦 Ihre Bestellung wurde versandt!</h2>

      <p>Hallo ${data.userName},</p>

      <p>Großartige Neuigkeiten! Ihre Bestellung ist jetzt unterwegs zu Ihnen.</p>

      <div class="info-box">
        <p><strong>Bestellnummer:</strong> ${data.orderNumber}</p>
        <p><strong>Bestelldatum:</strong> ${data.orderDate}</p>
        <p><strong>Gesamtbetrag:</strong> ${data.orderTotal}</p>
      </div>

      <div class="tracking-box">
        <h3>📍 Sendungsverfolgung</h3>
        <p style="margin: 10px 0; color: #595959;">Verfolgen Sie Ihre Sendung mit folgender Tracking-Nummer:</p>
        <div class="tracking-number">${data.trackingNumber}</div>
        <div class="button-container">
          <a href="${data.trackingUrl}" class="button button-primary">Sendung verfolgen</a>
        </div>
      </div>

      <p>Sie können den Status Ihrer Sendung jederzeit über den obigen Link oder auf der Bestellseite überprüfen.</p>

      <div class="button-container">
        <a href="${data.orderUrl}" class="button">Bestellung ansehen</a>
      </div>

      <p>Wir hoffen, dass Sie mit Ihrer Bestellung zufrieden sein werden!</p>
    </div>
  `;

  const html = getBaseTemplate(content, unsubscribeUrl);

  const text = `
DTF Transfer Print
Ihre Bestellung wurde versandt!

Hallo ${data.userName},

Großartige Neuigkeiten! Ihre Bestellung ist jetzt unterwegs zu Ihnen.

Bestelldetails:
Bestellnummer: ${data.orderNumber}
Bestelldatum: ${data.orderDate}
Gesamtbetrag: ${data.orderTotal}

📍 SENDUNGSVERFOLGUNG
Tracking-Nummer: ${data.trackingNumber}
Tracking-Link: ${data.trackingUrl}

Sie können den Status Ihrer Sendung jederzeit über den obigen Link oder auf der Bestellseite überprüfen.

Bestellung ansehen: ${data.orderUrl}

Wir hoffen, dass Sie mit Ihrer Bestellung zufrieden sein werden!

---
DTF Transfer Print
Hochwertige Direct-to-Film Transferdruck-Dienstleistungen

Abmelden: ${unsubscribeUrl}
`;

  return { html, text };
}

// Order Delivered Email (Abgeschlossen)
export function generateOrderDeliveredEmail(data: BaseOrderEmailData): {
  html: string;
  text: string;
} {
  const unsubscribeToken = generateUnsubscribeToken(data.userId);
  const unsubscribeUrl = `${data.baseUrl}/auth/unsubscribe?token=${unsubscribeToken}`;

  const content = `
    <div class="content">
      <h2>✅ Ihre Bestellung wurde zugestellt</h2>

      <p>Hallo ${data.userName},</p>

      <p>Ihre Bestellung wurde erfolgreich zugestellt. Wir hoffen, dass Sie mit Ihrer Bestellung zufrieden sind!</p>

      <div class="info-box">
        <p><strong>Bestellnummer:</strong> ${data.orderNumber}</p>
        <p><strong>Bestelldatum:</strong> ${data.orderDate}</p>
        <p><strong>Gesamtbetrag:</strong> ${data.orderTotal}</p>
      </div>

      <p>Vielen Dank, dass Sie sich für DTF Transfer Print entschieden haben. Ihre Zufriedenheit ist uns wichtig!</p>

      <div class="button-container">
        <a href="${data.orderUrl}" class="button">Bestellung ansehen</a>
      </div>

      <p><strong>Fragen oder Probleme?</strong><br>
      Sollten Sie Fragen zu Ihrer Bestellung haben oder Unterstützung benötigen, kontaktieren Sie uns gerne. Wir helfen Ihnen schnell und unkompliziert weiter.</p>

      <p style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e5e5e5;">
        Wir würden uns freuen, Sie bald wieder bei DTF Transfer Print begrüßen zu dürfen!
      </p>
    </div>
  `;

  const html = getBaseTemplate(content, unsubscribeUrl);

  const text = `
DTF Transfer Print
Ihre Bestellung wurde zugestellt

Hallo ${data.userName},

Ihre Bestellung wurde erfolgreich zugestellt. Wir hoffen, dass Sie mit Ihrer Bestellung zufrieden sind!

Bestelldetails:
Bestellnummer: ${data.orderNumber}
Bestelldatum: ${data.orderDate}
Gesamtbetrag: ${data.orderTotal}

Vielen Dank, dass Sie sich für DTF Transfer Print entschieden haben. Ihre Zufriedenheit ist uns wichtig!

Bestellung ansehen: ${data.orderUrl}

Fragen oder Probleme?
Sollten Sie Fragen zu Ihrer Bestellung haben oder Unterstützung benötigen, kontaktieren Sie uns gerne. Wir helfen Ihnen schnell und unkompliziert weiter.

Wir würden uns freuen, Sie bald wieder bei DTF Transfer Print begrüßen zu dürfen!

---
DTF Transfer Print
Hochwertige Direct-to-Film Transferdruck-Dienstleistungen

Abmelden: ${unsubscribeUrl}
`;

  return { html, text };
}
