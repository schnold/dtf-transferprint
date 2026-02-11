# Deployment Guide - Netlify

This guide will help you deploy your application to Netlify with all required environment variables.

## Prerequisites

Before deploying, ensure you have:
- [ ] A Netlify account
- [ ] A Neon PostgreSQL database
- [ ] An Upstash Redis instance
- [ ] A Cloudflare R2 bucket
- [ ] A Resend account for emails
- [ ] A PayPal developer account

## Step 1: Set Environment Variables in Netlify

Go to your Netlify site dashboard → **Site settings** → **Environment variables** and add the following:

### Authentication & Session

```bash
BETTER_AUTH_SECRET=<generate-with-command-below>
BETTER_AUTH_URL=https://your-domain.com
```

Generate `BETTER_AUTH_SECRET`:
```bash
openssl rand -base64 32
```
Or:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Database

```bash
NEON_DATABASE=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

Get this from your Neon dashboard → Connection string

### Redis (Session Storage)

```bash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

Get these from Upstash dashboard → REST API section

### Email (Resend)

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

Get this from Resend dashboard → API Keys

### File Storage (Cloudflare R2)

```bash
R2_API_KEY=https://account-id.eu.r2.cloudflarestorage.com/bucket-name
R2_ACCESS_KEY=your-access-key-id
R2_SECRET_KEY=your-secret-access-key
R2_CUSTOM_DOMAIN=https://your-r2-domain.com
```

Get these from Cloudflare dashboard → R2 → Manage R2 API Tokens

### Payment (PayPal)

```bash
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_MODE=sandbox
```

For production, change `PAYPAL_MODE` to `live`

Get these from PayPal Developer Dashboard → My Apps & Credentials

### Optional: Site Protection

```bash
BLOCK_PASSWORD=your-password-here
```

If set, adds a password overlay to the entire site (useful for staging).

## Step 2: Deploy

After setting all environment variables:

1. **Push to Git**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Netlify will automatically build and deploy**

3. **Monitor the build**: Check the Netlify deploy logs for any errors

## Step 3: Verify Deployment

After successful deployment:

1. ✅ Visit your site and ensure it loads
2. ✅ Test user registration and email verification
3. ✅ Test login/logout
4. ✅ Test adding items to cart
5. ✅ Test checkout flow (use PayPal sandbox)
6. ✅ Test admin panel access
7. ✅ Test contact form submission

## Common Issues

### Build Fails with "BETTER_AUTH_SECRET must be set"

**Solution**: Add `BETTER_AUTH_SECRET` to Netlify environment variables (see Step 1)

### Build Fails with Redis URL missing

**Solution**: Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Netlify environment variables

### 500 Error on Homepage

**Possible causes**:
- Missing `NEON_DATABASE` - Check database connection string
- Database tables not created - Run migrations first
- Missing required environment variables

### Email Verification Not Sending

**Possible causes**:
- Missing `RESEND_API_KEY`
- Invalid `BETTER_AUTH_URL` - Should match your production domain
- Resend domain not verified

### PayPal Checkout Fails

**Possible causes**:
- Missing `PAYPAL_CLIENT_ID` or `PAYPAL_CLIENT_SECRET`
- Wrong `PAYPAL_MODE` (should be `sandbox` for testing, `live` for production)
- PayPal credentials from wrong environment

## Security Checklist

Before going to production:

- [ ] All environment variables set in Netlify (not in code)
- [ ] `BETTER_AUTH_SECRET` is a strong random string (not the default)
- [ ] `PAYPAL_MODE` set to `live` (if going live)
- [ ] Database backups configured
- [ ] HTTPS enforced (automatic with Netlify)
- [ ] Custom domain configured (if applicable)
- [ ] Email domain verified in Resend
- [ ] R2 bucket properly configured with CORS if needed
- [ ] Admin user created in database
- [ ] Test all critical flows (auth, checkout, admin)

## Database Migrations

If this is your first deployment, you need to run database migrations:

1. **Connect to your database**:
   ```bash
   psql $NEON_DATABASE
   ```

2. **Run migrations** (if you have a migrations folder):
   ```bash
   npm run migrate
   ```

3. **Create admin user** (replace with your details):
   ```sql
   UPDATE "user" SET "isAdmin" = true WHERE email = 'your-email@example.com';
   ```

## Monitoring

After deployment, monitor:
- Netlify deploy logs
- Neon database performance
- Upstash Redis usage
- Resend email delivery
- Cloudflare R2 bandwidth
- PayPal transaction logs

## Support

If you encounter issues:
1. Check Netlify deploy logs
2. Check browser console for errors
3. Verify all environment variables are set correctly
4. Test each service independently (database, Redis, email, etc.)
5. Review [SECURITY_TEST_CHECKLIST.md](SECURITY_TEST_CHECKLIST.md) for security validations
