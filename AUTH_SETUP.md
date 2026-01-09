# Authentication Setup Documentation

## Overview

This project uses **Better Auth** for secure authentication with the following features:

- Email/password authentication with strong password requirements
- Email verification
- Session management with secure cookies
- Rate limiting to prevent brute force attacks
- Account lockout after failed login attempts
- PostgreSQL database (Neon) for user storage
- Upstash Redis for enhanced rate limiting (ready to implement)

## Security Features

### 1. Password Requirements
- Minimum 12 characters
- Must contain:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)

### 2. Account Protection
- Email verification required
- Failed login attempt tracking
- Account lockout mechanism
- Session expiration (7 days)
- Secure HTTP-only cookies
- CSRF protection

### 3. Rate Limiting
Built-in rate limits:
- Sign up: 5 attempts per hour
- Sign in: 10 attempts per 15 minutes
- Forgot password: 3 requests per hour
- General API: 100 requests per minute

### 4. Session Security
- Sessions expire after 7 days
- Session updates every 24 hours
- Cookie cache for performance (5 minutes)
- Secure cookies in production (HTTPS only)
- SameSite: Lax
- HTTP-only cookies (not accessible via JavaScript)

## File Structure

```
src/
├── lib/
│   ├── auth.ts              # Server-side auth configuration
│   └── auth-client.ts       # Client-side auth instance
├── middleware.ts            # Session middleware
├── env.d.ts                 # TypeScript type definitions
└── pages/
    ├── api/
    │   └── auth/
    │       └── [...all].ts  # Auth API handler
    └── auth/
        ├── login.astro      # Login page
        ├── signup.astro     # Sign up page
        └── account.astro    # Protected account page
```

## Environment Variables

```env
# Database
NEON_DATABASE=postgresql://...

# Better Auth
BETTER_AUTH_SECRET=<generated-secret>
BETTER_AUTH_URL=http://localhost:4321
PUBLIC_BETTER_AUTH_URL=http://localhost:4321

# Redis (for enhanced rate limiting)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## Database Schema

The following tables are created in your Neon database:

### `user` table
- id (primary key)
- name
- email (unique)
- emailVerified
- image
- accountLocked
- failedLoginAttempts
- lastLoginAt
- createdAt
- updatedAt

### `session` table
- id (primary key)
- token (unique)
- expiresAt
- ipAddress
- userAgent
- userId (foreign key to user)
- createdAt
- updatedAt

### `account` table
- id (primary key)
- accountId
- providerId
- userId (foreign key to user)
- password (hashed)
- accessToken
- refreshToken
- Other OAuth fields
- createdAt
- updatedAt

### `verification` table
- id (primary key)
- identifier
- value
- expiresAt
- createdAt
- updatedAt

## Usage

### Protecting Routes

Use `Astro.locals` to check authentication:

```astro
---
const user = Astro.locals.user;

if (!user) {
  return Astro.redirect('/auth/login');
}
---

<div>Welcome, {user.name}!</div>
```

### Client-Side Authentication

```typescript
import { authClient } from '@/lib/auth-client';

// Sign up
await authClient.signUp.email({
  email: 'user@example.com',
  password: 'SecureP@ssw0rd123',
  name: 'John Doe',
});

// Sign in
await authClient.signIn.email({
  email: 'user@example.com',
  password: 'SecureP@ssw0rd123',
});

// Sign out
await authClient.signOut();
```

### Server-Side Authentication

```typescript
import { auth } from '@/lib/auth';

// Get session
const session = await auth.api.getSession({
  headers: request.headers,
});

if (session) {
  console.log('User:', session.user);
  console.log('Session:', session.session);
}
```

## Available Pages

- `/auth/login` - Login page
- `/auth/signup` - Sign up page
- `/auth/account` - Protected account page (requires authentication)

## Security Best Practices Implemented

1. **Password Hashing**: Passwords are hashed using bcrypt before storage
2. **SQL Injection Prevention**: Using parameterized queries via PostgreSQL
3. **XSS Prevention**: Proper input sanitization and output encoding
4. **CSRF Protection**: Built into Better Auth
5. **Rate Limiting**: Prevents brute force and DoS attacks
6. **Secure Cookies**: HTTP-only, Secure (in production), SameSite
7. **Email Verification**: Prevents fake account creation
8. **Account Lockout**: Prevents password guessing
9. **Session Security**: Limited lifetime and automatic refresh
10. **Database Security**: SSL connections to Neon database

## Future Enhancements

To further enhance security, consider implementing:

1. **Two-Factor Authentication (2FA)**
   ```typescript
   import { twoFactor } from "better-auth/plugins";

   plugins: [twoFactor()]
   ```

2. **Magic Link Authentication**
   ```typescript
   import { magicLink } from "better-auth/plugins";

   plugins: [magicLink()]
   ```

3. **OAuth Providers** (Google, GitHub, etc.)
   ```typescript
   socialProviders: {
     google: {
       clientId: process.env.GOOGLE_CLIENT_ID,
       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
     },
   }
   ```

4. **Enhanced Rate Limiting with Redis**
   - Implement custom rate limiter using Upstash Redis
   - Track failed login attempts across distributed systems
   - Implement IP-based blocking

5. **Email Notifications**
   - Login from new device alerts
   - Password change confirmations
   - Suspicious activity warnings

6. **Session Management Dashboard**
   - View active sessions
   - Revoke sessions remotely
   - Session history

## Troubleshooting

### Database Connection Issues
If you encounter database connection issues:
1. Verify `NEON_DATABASE` connection string is correct
2. Check network connectivity to Neon
3. Ensure SSL is properly configured

### Rate Limiting Not Working
If rate limiting isn't working:
1. Ensure `x-forwarded-for` header is set in API handler
2. Check that client IP addresses are being captured correctly
3. Verify rate limit configuration in `auth.ts`

### Email Verification Not Sending
To implement email verification:
1. Configure an email provider (e.g., SendGrid, Resend)
2. Add email configuration to `auth.ts`
3. Implement verification email templates

## Support

For more information:
- Better Auth Documentation: https://better-auth.com
- Neon Documentation: https://neon.tech/docs
- Upstash Redis Documentation: https://upstash.com/docs/redis

## Production Deployment

Before deploying to production:

1. **Update Environment Variables**:
   - Set `NODE_ENV=production`
   - Update `BETTER_AUTH_URL` to your production domain
   - Update `PUBLIC_BETTER_AUTH_URL` to your production domain
   - Use HTTPS for all URLs

2. **Database**:
   - Ensure Neon database is in production mode
   - Review database connection pooling settings
   - Set up database backups

3. **Security**:
   - Enable HTTPS/SSL certificates
   - Review CORS settings
   - Configure proper CSP headers
   - Enable security headers (HSTS, X-Frame-Options, etc.)

4. **Monitoring**:
   - Set up error tracking (e.g., Sentry)
   - Monitor failed login attempts
   - Track session creation/deletion
   - Monitor database performance

5. **Email**:
   - Configure production email service
   - Set up email templates
   - Test email delivery
