/**
 * Security utilities for input validation and sanitization
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param unsafe - The untrusted string to escape
 * @returns Escaped string safe for HTML insertion
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') {
    return '';
  }

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns true if strings match, false otherwise
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  // Ensure both strings are the same length (pad shorter one)
  const length = Math.max(a.length, b.length);
  const bufferA = Buffer.from(a.padEnd(length, '\0'));
  const bufferB = Buffer.from(b.padEnd(length, '\0'));

  try {
    // Use crypto.timingSafeEqual if available (Node.js built-in)
    const crypto = require('crypto');
    return crypto.timingSafeEqual(bufferA, bufferB) && a.length === b.length;
  } catch {
    // Fallback to manual constant-time comparison
    let result = 0;
    for (let i = 0; i < bufferA.length; i++) {
      result |= bufferA[i] ^ bufferB[i];
    }
    return result === 0 && a.length === b.length;
  }
}

/**
 * Input validation limits
 */
export const INPUT_LIMITS = {
  NAME_MAX: 200,
  EMAIL_MAX: 254, // RFC 5321
  PHONE_MAX: 50,
  SUBJECT_MAX: 200,
  MESSAGE_MAX: 10000,
  COMPANY_MAX: 200,
  ADDRESS_MAX: 500,
} as const;

/**
 * Validates and sanitizes text input with length limits
 * @param input - The input to validate
 * @param maxLength - Maximum allowed length
 * @param fieldName - Name of the field for error messages
 * @returns Validated string
 * @throws Error if validation fails
 */
export function validateTextInput(
  input: any,
  maxLength: number,
  fieldName: string
): string {
  if (typeof input !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = input.trim();

  if (trimmed.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} cannot exceed ${maxLength} characters`);
  }

  return trimmed;
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }

  const trimmed = email.trim();

  // Basic RFC 5322 email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(trimmed) && trimmed.length <= INPUT_LIMITS.EMAIL_MAX;
}

/**
 * Sanitizes and validates phone number
 * @param phone - Phone number to validate
 * @returns Sanitized phone number
 * @throws Error if invalid
 */
export function validatePhoneNumber(phone: string): string {
  if (typeof phone !== 'string') {
    throw new Error('Phone number must be a string');
  }

  const trimmed = phone.trim();

  if (trimmed.length > INPUT_LIMITS.PHONE_MAX) {
    throw new Error(`Phone number cannot exceed ${INPUT_LIMITS.PHONE_MAX} characters`);
  }

  // Allow empty phone (optional field in most forms)
  if (trimmed.length === 0) {
    return trimmed;
  }

  // Basic validation: must contain at least some digits
  if (!/\d/.test(trimmed)) {
    throw new Error('Phone number must contain digits');
  }

  return trimmed;
}

/**
 * Validates URL is from allowed domains (prevents open redirect)
 * @param url - URL to validate
 * @param allowedDomains - List of allowed domains
 * @returns true if URL is safe, false otherwise
 */
export function isAllowedUrl(url: string, allowedDomains: string[]): boolean {
  try {
    const parsed = new URL(url);

    // Check if hostname matches any allowed domain
    return allowedDomains.some(domain => {
      return parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`);
    });
  } catch {
    // Invalid URL
    return false;
  }
}

/**
 * Sanitizes tracking URLs to prevent open redirects
 * Allowed carriers for tracking URLs
 */
const ALLOWED_TRACKING_DOMAINS = [
  'dhl.de',
  'www.dhl.de',
  'nolp.dhl.de',
  'deutschepost.de',
  'www.deutschepost.de',
  'dpd.com',
  'tracking.dpd.de',
  'www.dpd.com',
  'ups.com',
  'www.ups.com',
  'wwwapps.ups.com',
  'fedex.com',
  'www.fedex.com',
  'hermes.de',
  'www.hermes.de',
  'tracking.gls-group.eu',
  'gls-group.eu',
];

/**
 * Validates a tracking URL is from an allowed carrier
 * @param url - Tracking URL to validate
 * @returns true if valid, false otherwise
 */
export function validateTrackingUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  return isAllowedUrl(url, ALLOWED_TRACKING_DOMAINS);
}
