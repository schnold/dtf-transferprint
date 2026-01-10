# Admin Backend Setup - Secure Configuration

This project includes a highly secure admin backend with Neon PostgreSQL and Upstash Redis integration.

## Features

- Analytics Dashboard with real-time statistics
- User Management (read-only view of all users)
- Multi-layer secure authentication with database verification
- Redis caching for improved performance
- Admin activity logging and IP tracking
- Comprehensive security logging

## Security Features

**Multi-Layer Protection:**

1. **Session Authentication** - User must be logged in with valid session
2. **Database Verification** - Admin status verified directly from database on EVERY request (prevents session manipulation)
3. **Account Lock Check** - Locked accounts are immediately denied access
4. **IP Address Logging** - All admin access logged with IP addresses
5. **Security Event Logging** - Failed access attempts logged with full details
6. **Read-Only UI** - Admin status CANNOT be modified through the web interface
7. **No Admin APIs** - All admin modification endpoints have been removed
8. **Database-Only Admin Management** - Admin status can ONLY be changed via direct database access

## Accessing the Admin Panel

The admin panel is accessible at `/admin` and is protected by multiple security layers:

- Navigate to: `http://localhost:4321/admin` (or your production URL)
- Must be logged in with an account that has `isAdmin = true`
- The admin link appears in the user dropdown menu only for admin users

## Setting Up Admin Users

**⚠️ CRITICAL: Admin status can ONLY be set via direct database access.**

This is intentional to prevent privilege escalation and unauthorized admin promotion.

### Method 1: Direct SQL Query (Recommended)

```sql
UPDATE "user" SET "isAdmin" = true WHERE email = 'your-admin@example.com';
```

### Method 2: Using psql

```bash
psql "YOUR_NEON_DATABASE_URL"
```

Then run:
```sql
UPDATE "user" SET "isAdmin" = true WHERE email = 'your-email@example.com';
```

### Method 3: Using Neon Dashboard

1. Go to your Neon dashboard: https://console.neon.tech
2. Navigate to SQL Editor
3. Run:
```sql
UPDATE "user" SET "isAdmin" = true WHERE email = 'your-email@example.com';
```

## Admin Management Operations

All admin operations must be performed via SQL:

### Grant Admin Access
```sql
UPDATE "user" SET "isAdmin" = true WHERE email = 'user@example.com';
```

### Revoke Admin Access
```sql
UPDATE "user" SET "isAdmin" = false WHERE email = 'user@example.com';
```

### Lock an Account
```sql
UPDATE "user" SET "accountLocked" = true WHERE email = 'user@example.com';
```

### Unlock an Account
```sql
UPDATE "user" SET "accountLocked" = false WHERE email = 'user@example.com';
```

### View All Admins
```sql
SELECT id, name, email, "isAdmin", "createdAt"
FROM "user"
WHERE "isAdmin" = true;
```

## Admin Routes

- `/admin` - Analytics Dashboard
- `/admin/users` - User Management (Read-Only)
- `/admin/settings` - Settings (Placeholder)

## Database Schema

The `user` table includes:

```sql
"isAdmin" boolean NOT NULL DEFAULT false
"accountLocked" boolean NOT NULL DEFAULT false
```

All users have `isAdmin = false` by default.

## Middleware Protection

The middleware in `src/middleware.ts` implements multi-layer security:

1. **Session Validation** - Checks if user is authenticated
2. **Redirect Non-Authenticated** - Redirects to login if not authenticated
3. **Database Admin Verification** - Queries database directly to verify admin status (does NOT rely on session cache)
4. **Account Lock Check** - Verifies account is not locked
5. **Security Logging** - Logs all admin access attempts with:
   - User email
   - User ID
   - Requested path
   - IP address (including x-forwarded-for)
   - Timestamp
6. **Unauthorized Access Logging** - Logs failed access attempts with security warnings

### Security Log Examples

```
[ADMIN ACCESS] User: admin@example.com, Path: /admin, IP: 192.168.1.1
[SECURITY] Non-admin user attempted admin access: user@example.com from IP: 192.168.1.2
[SECURITY] Locked account attempted admin access: locked@example.com
```

## Caching

Redis is used for performance optimization:

- **Analytics**: Cached for 5 minutes
- **User list**: Cached for 1 minute
- **Admin activity**: Stored for last 100 actions per user

Cache is automatically invalidated when necessary.

## Security Best Practices

1. **Never share database credentials** - Keep your Neon database URL secure
2. **Use strong passwords** - Minimum 12 characters with uppercase, lowercase, numbers, and special characters
3. **Monitor logs** - Regularly check server logs for unauthorized access attempts
4. **Limit admin accounts** - Only grant admin access to trusted users
5. **Enable 2FA** - Use email verification for all accounts
6. **Review admin list** - Periodically audit who has admin access
7. **Use production settings** - Set `NODE_ENV=production` and enable HTTPS

## Development

Start the development server:

```bash
npm run dev
```

Then navigate to:
- Main site: http://localhost:4321
- Admin panel: http://localhost:4321/admin

## Production Deployment

Ensure these settings are configured:

1. `NODE_ENV=production`
2. `BETTER_AUTH_URL` set to your production URL (HTTPS)
3. SSL/HTTPS enabled
4. Secure cookies enabled (automatic in production)
5. Database connection uses SSL

## Troubleshooting

### Can't access admin panel

1. Verify you're logged in
2. Check admin status in database:
   ```sql
   SELECT email, "isAdmin", "accountLocked" FROM "user" WHERE email = 'your-email@example.com';
   ```
3. Ensure `isAdmin = true` and `accountLocked = false`
4. Clear browser cookies and log in again
5. Check server logs for security warnings

### Admin link not showing in navbar

The admin link only appears for users with `isAdmin = true`. Verify in the database.

### 403 Forbidden error

This means either:
- Your account doesn't have admin privileges
- Your account is locked
- Session has expired (log in again)

Check the server console for security log messages.

## Database Migrations

Migration files are in `better-auth_migrations/`:

- `2026-01-10T20-53-44.927Z.sql` - Adds `isAdmin` column

To run migrations:

```bash
node scripts/migrate.js
```

## Support

For security issues or questions, review the code in:
- `src/middleware.ts` - Middleware protection
- `src/lib/db.ts` - Database utilities
- `src/lib/redis.ts` - Caching and activity tracking
