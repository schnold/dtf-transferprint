import { generateUnsubscribeToken } from './email';

/**
 * HTML escape function to prevent XSS in email templates
 * Escapes &, <, >, ", ', /, and backticks
 */
function escapeHtml(text: string | number | undefined | null): string {
  if (text === undefined || text === null) {
    return '';
  }

  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;');
}

interface OrderConfirmationEmailData {
  userName: string;
  userId: string;
  baseUrl: string;
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

export function generateOrderConfirmationEmail(
  data: OrderConfirmationEmailData,
  getBaseTemplate: (content: string, unsubscribeUrl: string) => string
): {
  html: string;
  text: string;
} {
  const unsubscribeToken = generateUnsubscribeToken(data.userId);
  const unsubscribeUrl = `${data.baseUrl}/auth/unsubscribe?token=${unsubscribeToken}`;

  // Build order items list with HTML escaping for security
  const orderItemsHTML = data.orderItems
    .map(
      (item) => `
    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
      <div>
        <p style="margin: 0; font-weight: 600; color: #262626;">${escapeHtml(item.name)}</p>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #A6A6A6;">Menge: ${escapeHtml(item.quantity)}</p>
      </div>
      <div style="text-align: right;">
        <p style="margin: 0; font-weight: 600; color: #262626;">${escapeHtml(item.price)}</p>
      </div>
    </div>
  `
    )
    .join('');

  const orderItemsText = data.orderItems
    .map((item) => `${escapeHtml(item.name)} x${escapeHtml(item.quantity)} - ${escapeHtml(item.price)}`)
    .join('\\n');

  let userDiscountHTML = '';
  let userDiscountText = '';
  if (data.userDiscountPercent && data.userDiscountPercent > 0) {
    userDiscountHTML = `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #22C55E;">
          <span>Ihr Rabatt (${escapeHtml(data.userDiscountPercent)}%):</span>
          <span style="font-weight: 600;">-${escapeHtml(data.discountAmount)}</span>
        </div>`;
    userDiscountText = `\\nIhr Rabatt (${escapeHtml(data.userDiscountPercent)}%): -${escapeHtml(data.discountAmount)}`;
  }

  let campaignDiscountHTML = '';
  let campaignDiscountText = '';
  if (data.discountCode && data.discountAmount) {
    campaignDiscountHTML = `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #22C55E;">
          <span>Rabatt (${escapeHtml(data.discountCode)}):</span>
          <span style="font-weight: 600;">-${escapeHtml(data.discountAmount)}</span>
        </div>`;
    campaignDiscountText = `\\nRabatt (${escapeHtml(data.discountCode)}): -${escapeHtml(data.discountAmount)}`;
  }

  const content = `
    <div class="content">
      <h2>Bestellbestätigung</h2>

      <p>Hallo ${escapeHtml(data.userName)},</p>

      <p>Vielen Dank für Ihre Bestellung! Wir haben Ihre Zahlung erhalten und bearbeiten Ihre Bestellung.</p>

      <div class="info-box">
        <p><strong>Bestellnummer:</strong> ${escapeHtml(data.orderNumber)}</p>
        <p><strong>Bestelldatum:</strong> ${escapeHtml(data.orderDate)}</p>
        <p><strong>Gesamtbetrag:</strong> ${escapeHtml(data.orderTotal)}</p>
      </div>

      <h3 style="margin: 30px 0 20px 0; color: #262626; font-size: 20px; font-weight: 600;">Bestellte Artikel</h3>

      <div style="border: 1px solid #e5e5e5; border-radius: 8px; padding: 15px; margin: 20px 0;">
        ${orderItemsHTML}
      </div>

      <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span style="color: #595959;">Zwischensumme:</span>
          <span style="font-weight: 600; color: #262626;">${escapeHtml(data.subtotal)}</span>
        </div>
        ${userDiscountHTML}
        ${campaignDiscountHTML}
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span style="color: #595959;">Versand:</span>
          <span style="font-weight: 600; color: #262626;">${escapeHtml(data.shippingCost)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span style="color: #595959;">MwSt. (19%):</span>
          <span style="font-weight: 600; color: #262626;">${escapeHtml(data.taxAmount)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #D95829; margin-top: 10px;">
          <span style="font-weight: 700; color: #262626; font-size: 18px;">Gesamt:</span>
          <span style="font-weight: 700; color: #D95829; font-size: 18px;">${escapeHtml(data.orderTotal)}</span>
        </div>
      </div>

      <div class="button-container">
        <a href="${data.orderUrl}" class="button">Bestellung ansehen</a>
      </div>

      <div class="security-notice">
        <p><strong>📦 Was passiert als Nächstes?</strong></p>
        <p style="margin-top: 10px;">Wir beginnen sofort mit der Bearbeitung Ihrer Bestellung. Sie erhalten eine weitere E-Mail mit Tracking-Informationen, sobald Ihre Bestellung versandt wurde.</p>
      </div>

      <div class="divider"></div>

      <p style="font-size: 14px; color: #A6A6A6;">
        Fragen zu Ihrer Bestellung? <a href="${data.baseUrl}/contact" class="link">Kontaktieren Sie uns</a>
      </p>
    </div>
  `;

  const html = getBaseTemplate(content, unsubscribeUrl);

  const text = `
Hallo ${escapeHtml(data.userName)},

Vielen Dank für Ihre Bestellung! Wir haben Ihre Zahlung erhalten und bearbeiten Ihre Bestellung.

Bestelldetails:
---------------
Bestellnummer: ${escapeHtml(data.orderNumber)}
Bestelldatum: ${escapeHtml(data.orderDate)}
Gesamtbetrag: ${escapeHtml(data.orderTotal)}

Bestellte Artikel:
${orderItemsText}

Preisübersicht:
Zwischensumme: ${escapeHtml(data.subtotal)}${userDiscountText}${campaignDiscountText}
Versand: ${escapeHtml(data.shippingCost)}
MwSt. (19%): ${escapeHtml(data.taxAmount)}
---
Gesamt: ${escapeHtml(data.orderTotal)}

Bestellung ansehen: ${data.orderUrl}

Was passiert als Nächstes?
Wir beginnen sofort mit der Bearbeitung Ihrer Bestellung. Sie erhalten eine weitere E-Mail mit Tracking-Informationen, sobald Ihre Bestellung versandt wurde.

Fragen zu Ihrer Bestellung? Kontaktieren Sie uns: ${data.baseUrl}/contact

---
DTF Transfer Print
Hochwertige Direct-to-Film Transferdruck-Dienstleistungen

Abmelden: ${unsubscribeUrl}
  `.trim();

  return { html, text };
}
