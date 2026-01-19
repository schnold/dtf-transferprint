import "dotenv/config";
import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { Redis } from "@upstash/redis";
import { sendEmail } from "./email";
import {
  generateVerificationEmail,
  generatePasswordResetEmail,
  generateWelcomeEmail,
} from "./email-templates";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE,
  ssl: {
    rejectUnauthorized: false,
  },
});

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const BASE_URL = process.env.BETTER_AUTH_URL || "http://localhost:4321";

export const auth = betterAuth({
  database: pool,

  // Email verification configuration
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      const { html, text } = generateVerificationEmail({
        userName: user.name,
        userId: user.id,
        verificationUrl: url,
        baseUrl: BASE_URL,
      });

      // Use void to avoid blocking and prevent timing attacks
      void sendEmail({
        to: user.email,
        subject: "Verify your email address - DTF Transfer Print",
        html,
        text,
      });
    },
    async afterEmailVerification(user, request) {
      // Send welcome email after successful verification
      const { html, text } = generateWelcomeEmail({
        userName: user.name,
        userId: user.id,
        baseUrl: BASE_URL,
      });

      void sendEmail({
        to: user.email,
        subject: "Welcome to DTF Transfer Print! 🎉",
        html,
        text,
      });

      console.log(`✅ Email verified for user: ${user.email}`);
    },
  },

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    // Password must contain uppercase, lowercase, number, and special character
    password: {
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialCharacters: true,
    },
    // Password reset configuration
    sendResetPassword: async ({ user, url, token }, request) => {
      const { html, text } = generatePasswordResetEmail({
        userName: user.name,
        userId: user.id,
        resetUrl: url,
        baseUrl: BASE_URL,
      });

      // Use void to avoid blocking and prevent timing attacks
      void sendEmail({
        to: user.email,
        subject: "Reset your password - DTF Transfer Print",
        html,
        text,
      });
    },
  },

  // Account creation security
  user: {
    // Additional user fields for enhanced security
    additionalFields: {
      emailVerified: {
        type: "boolean",
        defaultValue: false,
      },
      accountLocked: {
        type: "boolean",
        defaultValue: false,
      },
      failedLoginAttempts: {
        type: "number",
        defaultValue: 0,
      },
      lastLoginAt: {
        type: "date",
        required: false,
      },
      emailNotifications: {
        type: "boolean",
        defaultValue: true,
      },
      isAdmin: {
        type: "boolean",
        defaultValue: false,
      },
      gewerbebetreiber: {
        type: "boolean",
        defaultValue: false,
      },
      umsatzsteuernummer: {
        type: "string",
        required: false,
      },
      discountPercent: {
        type: "number",
        defaultValue: 0,
      },
    },
  },

  // Session configuration for security
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Security headers and CSRF protection
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "dtf_auth",
    crossSubDomainCookies: {
      enabled: false,
    },
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  },

  // Rate limiting configuration
  rateLimit: {
    enabled: true,
    storage: "memory", // We'll use Redis with a plugin for better rate limiting
    window: 60, // 1 minute
    max: 100, // 100 requests per minute
    customRules: {
      "/sign-up": {
        window: 3600, // 1 hour
        max: 5, // 5 sign-up attempts per hour
      },
      "/sign-in": {
        window: 900, // 15 minutes
        max: 10, // 10 sign-in attempts per 15 minutes
      },
      "/forgot-password": {
        window: 3600, // 1 hour
        max: 3, // 3 forgot password requests per hour
      },
    },
  },

  // Trusted origins for CORS
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:4321",
  ],
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
