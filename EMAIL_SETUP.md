# Email System Documentation

## Overview

This project includes a comprehensive email system for user authentication and notifications with professional HTML templates, unsubscribe functionality, and security features.

## Features

✅ **Email Verification**
- Sent automatically on sign-up
- Professional HTML templates
- 24-hour expiration for security
- Auto sign-in after verification
- Welcome email after successful verification

✅ **Password Reset**
- Secure token-based reset flow
- 1-hour expiration
- Beautiful email templates
- Clear security instructions

✅ **Unsubscribe Management**
- One-click unsubscribe from emails
- Persistent user preferences
- Graceful handling of invalid tokens

✅ **Professional Email Templates**
- Modern, responsive design
- Gradient headers matching brand
- Mobile-optimized
- Plain text fallbacks
- Security notices

✅ **Security Features**
- Void email sending to prevent timing attacks
- Signed unsubscribe tokens
- Rate limiting on password reset
- Email verification required before login

## File Structure

```
src/
├── lib/
│   ├── email.ts                  # Email service with SMTP configuration
│   └── email-templates.ts        # HTML email template generators
├── pages/
│   └── auth/
│       ├── login.astro           # Login with "Forgot password" link
│       ├── signup.astro          # Sign up form
│       ├── forgot-password.astro # Request password reset
│       ├── reset-password.astro  # Reset password with token
│       └── unsubscribe.astro     # Unsubscribe from emails
```

## Email Configuration

### Development Mode

In development, if SMTP credentials are not configured:
- Emails are logged to the console
- No actual emails are sent
- Full email content is displayed for debugging

### Production Setup

#### Option 1: Gmail (Easiest for testing)

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App Passwords
   - Select "Mail" and generate password
3. Update `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="DTF Transfer Print <your-email@gmail.com>"
```

#### Option 2: Resend (Recommended for Production)

Resend is modern, developer-friendly, and has a generous free tier.

1. Sign up at https://resend.com
2. Get your API key
3. Add your domain and verify DNS records
4. Update `.env`:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASS=re_your_api_key_here
SMTP_FROM="DTF Transfer Print <noreply@yourdomain.com>"
```

#### Option 3: SendGrid

1. Sign up at https://sendgrid.com
2. Create an API key
3. Update `.env`:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your_sendgrid_api_key
SMTP_FROM="DTF Transfer Print <noreply@yourdomain.com>"
```

#### Option 4: AWS SES

1. Set up AWS SES in your region
2. Verify your domain or email
3. Create SMTP credentials
4. Update `.env`:

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
SMTP_FROM="DTF Transfer Print <noreply@yourdomain.com>"
```

## Email Templates

### 1. Email Verification

**Trigger**: Automatically sent when user signs up

**Template Features**:
- Professional gradient header
- Clear call-to-action button
- Security notice
- Alternative text link
- 24-hour expiration notice
- Unsubscribe link in footer

**User Journey**:
1. User signs up → Verification email sent
2. User clicks "Verify Email" button
3. Email verified → Welcome email sent
4. User auto-signed in

### 2. Welcome Email

**Trigger**: Sent after successful email verification

**Template Features**:
- Celebration message
- Quick start guide
- Links to key features
- Professional branding

### 3. Password Reset

**Trigger**: User clicks "Forgot password" and enters email

**Template Features**:
- Clear reset instructions
- Security warnings
- 1-hour expiration notice
- Password best practices
- Unsubscribe link in footer

**User Journey**:
1. User requests password reset
2. Email sent with reset link
3. User clicks link → Taken to reset form
4. User sets new password → Redirected to login

## Unsubscribe Functionality

### How It Works

1. Every email includes an unsubscribe link in the footer
2. Link contains a signed token with user ID
3. Clicking the link shows a confirmation page
4. Upon confirmation, `emailNotifications` flag is set to `false`
5. User can re-subscribe from account settings

### Database Field

The `user` table includes an `emailNotifications` boolean field:
- Default: `true` (subscribed)
- Set to `false` to unsubscribe

### Token Security

Unsubscribe tokens:
- Include user ID and timestamp
- Base64url encoded
- Valid for 30 days
- Cannot be used for account access

## Security Considerations

### 1. Timing Attack Prevention

```typescript
// Use void to avoid blocking
void sendEmail({ ... });
```

This prevents attackers from determining if an email exists in the system by measuring response times.

### 2. Rate Limiting

Password reset requests are limited to:
- 3 requests per hour per IP
- Configured in `auth.ts` rate limiting rules

### 3. Token Expiration

- Email verification: 24 hours
- Password reset: 1 hour
- Unsubscribe links: 30 days

### 4. Email Validation

- Email format validated on client and server
- Password strength enforced (12+ chars, mixed case, numbers, special chars)
- Confirmation required for password reset

## Testing Emails

### Development Testing

1. Start the dev server: `npm run dev`
2. Sign up at `http://localhost:4321/auth/signup`
3. Check console for email content:

```
✅ Email sent successfully: <message-id>
📧 Email Content (not sent):
To: user@example.com
Subject: Verify your email address - DTF Transfer Print
Text: [email content]
```

### Production Testing

1. Configure SMTP credentials in `.env`
2. Restart the server
3. Sign up with a real email address
4. Check your inbox for the verification email
5. Test the following flows:
   - Email verification
   - Password reset
   - Unsubscribe

## Customizing Email Templates

### Branding

Edit `src/lib/email-templates.ts`:

```typescript
// Change colors
const EMAIL_STYLES = `
  <style>
    .header {
      background: linear-gradient(135deg, #YOUR_COLOR1 0%, #YOUR_COLOR2 100%);
    }
    .button {
      background: linear-gradient(135deg, #YOUR_COLOR1 0%, #YOUR_COLOR2 100%);
    }
  </style>
`;

// Change company name
<h1>Your Company Name</h1>

// Change footer
<p><strong>Your Company Name</strong></p>
<p>Your tagline here</p>
```

### Adding New Email Templates

1. Create a new template function in `email-templates.ts`:

```typescript
export function generateOrderConfirmationEmail(data: OrderData): {
  html: string;
  text: string;
} {
  // Your template here
}
```

2. Use it in your code:

```typescript
import { generateOrderConfirmationEmail } from './lib/email-templates';
import { sendEmail } from './lib/email';

const { html, text } = generateOrderConfirmationEmail({
  userName: user.name,
  orderId: order.id,
  // ...
});

void sendEmail({
  to: user.email,
  subject: 'Order Confirmation',
  html,
  text,
});
```

## Troubleshooting

### Emails Not Sending

1. **Check SMTP credentials**:
   ```bash
   # Verify environment variables are set
   echo $SMTP_HOST
   echo $SMTP_PORT
   echo $SMTP_USER
   ```

2. **Check console for errors**:
   - Look for "❌ Failed to send email" messages
   - Check the error details

3. **Test SMTP connection**:
   - Use a tool like Telnet to test connectivity
   - Verify firewall isn't blocking port 587

4. **Check spam folder**:
   - Emails might be flagged as spam
   - Add SPF, DKIM, and DMARC records to your domain

### Emails Going to Spam

1. **Set up SPF record**:
   ```
   v=spf1 include:_spf.google.com ~all
   ```

2. **Set up DKIM** (provided by email service)

3. **Set up DMARC**:
   ```
   v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
   ```

4. **Use a verified sender domain**

5. **Warm up your domain** (gradually increase sending volume)

### Token Expired Errors

- Email verification tokens expire after 24 hours
- Password reset tokens expire after 1 hour
- User must request a new link

### Unsubscribe Not Working

1. Check that database migration was run:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'user' AND column_name = 'emailNotifications';
   ```

2. Verify token is valid:
   - Tokens expire after 30 days
   - User must use a recent unsubscribe link

## Email Service Comparison

| Provider  | Free Tier        | Setup Difficulty | Best For              |
|-----------|------------------|------------------|-----------------------|
| Gmail     | 500/day          | Easy             | Testing/Small scale   |
| Resend    | 100/day          | Easy             | Production (modern)   |
| SendGrid  | 100/day          | Medium           | Production (established) |
| Mailgun   | 5,000/month      | Medium           | High volume           |
| AWS SES   | 62,000/month*    | Hard             | Large scale/AWS users |
| Postmark  | 100/month        | Easy             | Transactional only    |

*AWS SES free tier available when sending from EC2

## Best Practices

1. **Always use void for email sending**:
   ```typescript
   void sendEmail({ ... }); // Don't await
   ```

2. **Include unsubscribe links** in all marketing emails

3. **Use plain text fallbacks** for email clients that don't support HTML

4. **Test emails in multiple clients**:
   - Gmail
   - Outlook
   - Apple Mail
   - Mobile devices

5. **Monitor email deliverability**:
   - Track bounce rates
   - Monitor spam complaints
   - Check email open rates

6. **Respect user preferences**:
   - Honor unsubscribe requests immediately
   - Don't send marketing emails to unsubscribed users
   - Still send critical account emails (password reset, security alerts)

7. **Use proper email types**:
   - Transactional: No unsubscribe needed (password reset, verification)
   - Marketing: Must have unsubscribe (newsletters, promotions)

## Future Enhancements

Consider implementing:

1. **Email Analytics**
   - Track open rates
   - Track click rates
   - A/B testing

2. **Email Queue**
   - Use Redis or database queue
   - Retry failed emails
   - Bulk sending support

3. **Email Templates in Database**
   - Store templates in database
   - Allow admin to edit templates
   - Version control for templates

4. **Multi-language Support**
   - Detect user language
   - Send emails in user's language
   - Maintain multiple template versions

5. **Advanced Notifications**
   - Order status updates
   - Shipping notifications
   - Marketing campaigns
   - Newsletter system

6. **Email Verification Code (OTP)**
   - Alternative to magic links
   - 6-digit codes
   - Better for mobile users

## Support

For issues or questions:
- Check the Better Auth documentation: https://better-auth.com
- Review Nodemailer docs: https://nodemailer.com
- Check your email provider's documentation
