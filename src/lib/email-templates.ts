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

const EMAIL_STYLES = `
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
    }

    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .content {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
    }

    .content h2 {
      color: #1a1a1a;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 20px 0;
    }

    .content p {
      color: #555555;
      font-size: 16px;
      margin: 0 0 20px 0;
    }

    .button {
      display: inline-block;
      padding: 16px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      transition: transform 0.2s;
    }

    .button:hover {
      transform: translateY(-2px);
    }

    .button-container {
      text-align: center;
      margin: 30px 0;
    }

    .security-notice {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px 20px;
      margin: 25px 0;
      border-radius: 4px;
    }

    .security-notice p {
      margin: 0;
      font-size: 14px;
      color: #666666;
    }

    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #999999;
      font-size: 13px;
      border-top: 1px solid #e5e5e5;
    }

    .footer a {
      color: #667eea;
      text-decoration: none;
    }

    .footer p {
      margin: 5px 0;
      color: #999999;
    }

    .divider {
      height: 1px;
      background-color: #e5e5e5;
      margin: 30px 0;
    }

    .link {
      color: #667eea;
      text-decoration: none;
      word-break: break-all;
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

function getBaseTemplate(content: string, unsubscribeUrl: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
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
          <p>High-quality direct-to-film transfer printing services</p>
          <div class="divider"></div>
          <p>
            <a href="${unsubscribeUrl}">Unsubscribe</a> from these emails
          </p>
          <p style="margin-top: 15px;">
            This email was sent to you because you created an account with DTF Transfer Print.
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
      <h2>Verify Your Email Address</h2>

      <p>Hi ${data.userName},</p>

      <p>Thank you for signing up with DTF Transfer Print! To complete your registration and start using your account, please verify your email address.</p>

      <div class="button-container">
        <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
      </div>

      <p>This verification link will expire in 24 hours for security reasons.</p>

      <div class="security-notice">
        <p><strong>🔒 Security Note:</strong> If you didn't create an account with DTF Transfer Print, you can safely ignore this email.</p>
      </div>

      <div class="divider"></div>

      <p style="font-size: 14px; color: #999999;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.verificationUrl}" class="link">${data.verificationUrl}</a>
      </p>
    </div>
  `;

  const html = getBaseTemplate(content, unsubscribeUrl);

  const text = `
Hi ${data.userName},

Thank you for signing up with DTF Transfer Print! To complete your registration and start using your account, please verify your email address.

Verify your email by clicking this link:
${data.verificationUrl}

This verification link will expire in 24 hours for security reasons.

Security Note: If you didn't create an account with DTF Transfer Print, you can safely ignore this email.

---
DTF Transfer Print
High-quality direct-to-film transfer printing services

Unsubscribe: ${unsubscribeUrl}
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
      <h2>Reset Your Password</h2>

      <p>Hi ${data.userName},</p>

      <p>We received a request to reset your password for your DTF Transfer Print account. Click the button below to create a new password:</p>

      <div class="button-container">
        <a href="${data.resetUrl}" class="button">Reset Password</a>
      </div>

      <p>This password reset link will expire in 1 hour for security reasons.</p>

      <div class="security-notice">
        <p><strong>🔒 Security Note:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged. Consider changing your password if you're concerned about account security.</p>
      </div>

      <div class="divider"></div>

      <p style="font-size: 14px; color: #999999;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.resetUrl}" class="link">${data.resetUrl}</a>
      </p>

      <p style="font-size: 14px; color: #999999; margin-top: 20px;">
        For security reasons, we recommend:
      </p>
      <ul style="font-size: 14px; color: #999999; margin-top: 10px;">
        <li>Using a strong, unique password</li>
        <li>Not sharing your password with anyone</li>
        <li>Enabling two-factor authentication (coming soon)</li>
      </ul>
    </div>
  `;

  const html = getBaseTemplate(content, unsubscribeUrl);

  const text = `
Hi ${data.userName},

We received a request to reset your password for your DTF Transfer Print account. Click the link below to create a new password:

${data.resetUrl}

This password reset link will expire in 1 hour for security reasons.

Security Note: If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

For security reasons, we recommend:
- Using a strong, unique password
- Not sharing your password with anyone
- Enabling two-factor authentication (coming soon)

---
DTF Transfer Print
High-quality direct-to-film transfer printing services

Unsubscribe: ${unsubscribeUrl}
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
      <h2>Welcome to DTF Transfer Print! 🎉</h2>

      <p>Hi ${data.userName},</p>

      <p>Thank you for verifying your email! Your account is now fully activated and ready to use.</p>

      <p>Here's what you can do next:</p>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <p style="margin: 0 0 15px 0;"><strong>✨ Explore Our Services</strong><br>Browse our wide range of DTF transfer printing options</p>
        <p style="margin: 0 0 15px 0;"><strong>🎨 Upload Your Designs</strong><br>Start creating custom transfers with your artwork</p>
        <p style="margin: 0;"><strong>📦 Track Your Orders</strong><br>Monitor all your orders from your account dashboard</p>
      </div>

      <div class="button-container">
        <a href="${data.baseUrl}/products" class="button">Browse Products</a>
      </div>

      <div class="divider"></div>

      <p style="font-size: 14px; color: #999999;">
        Need help getting started? Check out our <a href="${data.baseUrl}/eigenschaften" class="link">features page</a> or contact our support team.
      </p>
    </div>
  `;

  const html = getBaseTemplate(content, unsubscribeUrl);

  const text = `
Hi ${data.userName},

Thank you for verifying your email! Your account is now fully activated and ready to use.

Here's what you can do next:

✨ Explore Our Services
Browse our wide range of DTF transfer printing options

🎨 Upload Your Designs
Start creating custom transfers with your artwork

📦 Track Your Orders
Monitor all your orders from your account dashboard

Get started: ${data.baseUrl}/products

Need help? Visit our features page: ${data.baseUrl}/eigenschaften

---
DTF Transfer Print
High-quality direct-to-film transfer printing services

Unsubscribe: ${unsubscribeUrl}
  `.trim();

  return { html, text };
}
