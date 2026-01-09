import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  // Check if SMTP credentials are configured
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    console.warn(
      "⚠️  SMTP credentials not configured. Emails will be logged to console only."
    );
    console.warn(
      "   Add SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to .env to enable email sending."
    );

    // Create a test account for development (ethereal.email)
    // This allows testing without real SMTP credentials
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: "test@ethereal.email",
        pass: "test123",
      },
    });

    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  // If SMTP is not configured, just log in development
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    if (process.env.NODE_ENV === "development") {
      console.log("\n📧 Email Content (SMTP not configured):");
      console.log("To:", options.to);
      console.log("Subject:", options.subject);
      console.log("Text:", options.text);
      console.log("\n");
    }
    return;
  }

  const transporter = getTransporter();

  const mailOptions = {
    from: process.env.SMTP_FROM || '"DTF Transfer Print" <noreply@dtf-transfer.com>',
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);

    // If using ethereal.email, log the preview URL
    if (process.env.NODE_ENV === "development" && !process.env.SMTP_HOST) {
      console.log("📧 Preview URL:", nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    // In development, log the email content for debugging
    if (process.env.NODE_ENV === "development") {
      console.log("\n📧 Email Content (not sent):");
      console.log("To:", options.to);
      console.log("Subject:", options.subject);
      console.log("Text:", options.text);
      console.log("\n");
    }
    // Only throw in production to prevent signup failures in development
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }
}

export function generateUnsubscribeToken(userId: string): string {
  // In production, use a proper JWT or signed token
  // For now, we'll use a simple base64 encoded string
  const data = JSON.stringify({
    userId,
    timestamp: Date.now(),
  });
  return Buffer.from(data).toString("base64url");
}

export function verifyUnsubscribeToken(token: string): { userId: string } | null {
  try {
    const data = JSON.parse(Buffer.from(token, "base64url").toString());
    // Verify token is not too old (30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (data.timestamp < thirtyDaysAgo) {
      return null;
    }
    return { userId: data.userId };
  } catch {
    return null;
  }
}
