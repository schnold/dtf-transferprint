/**
 * Input validation utilities for security
 * Prevents buffer overflow, DoS via large payloads, and data integrity issues
 */

export interface ValidationRule {
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  required?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate string input against rules
 */
export function validateString(
  value: string | null | undefined,
  fieldName: string,
  rules: ValidationRule
): ValidationResult {
  // Check required
  if (rules.required && (!value || value.trim().length === 0)) {
    return {
      valid: false,
      error: `${fieldName} is required`,
    };
  }

  // If not required and empty, skip other validations
  if (!value) {
    return { valid: true };
  }

  // Check length
  if (rules.maxLength && value.length > rules.maxLength) {
    return {
      valid: false,
      error: `${fieldName} cannot exceed ${rules.maxLength} characters`,
    };
  }

  if (rules.minLength && value.length < rules.minLength) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${rules.minLength} characters`,
    };
  }

  // Check pattern
  if (rules.pattern && !rules.pattern.test(value)) {
    return {
      valid: false,
      error: `${fieldName} format is invalid`,
    };
  }

  return { valid: true };
}

/**
 * Common validation rules for different field types
 */
export const ValidationRules = {
  // Address fields
  NAME: { maxLength: 100, minLength: 1, required: true },
  COMPANY: { maxLength: 200 },
  ADDRESS_LINE: { maxLength: 255, minLength: 3, required: true },
  CITY: { maxLength: 100, minLength: 2, required: true },
  POSTAL_CODE: { maxLength: 20, minLength: 3, required: true },
  COUNTRY_CODE: { maxLength: 2, minLength: 2, pattern: /^[A-Z]{2}$/, required: true },
  PHONE: { maxLength: 30, pattern: /^[\d\s\+\-\(\)]+$/ },

  // Product fields
  PRODUCT_NAME: { maxLength: 200, minLength: 3, required: true },
  PRODUCT_DESCRIPTION: { maxLength: 5000 },
  SKU: { maxLength: 100 },

  // Order fields
  ORDER_NOTE: { maxLength: 1000 },
  TRACKING_NUMBER: { maxLength: 100, minLength: 5, required: true },

  // Discount fields
  DISCOUNT_CODE: { maxLength: 50, pattern: /^[a-zA-Z0-9_-]+$/, required: true },

  // General text fields
  SHORT_TEXT: { maxLength: 100 },
  MEDIUM_TEXT: { maxLength: 500 },
  LONG_TEXT: { maxLength: 5000 },
} as const;

/**
 * Validate an entire object against a schema
 */
export function validateObject<T extends Record<string, any>>(
  data: T,
  schema: Record<keyof T, ValidationRule>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const result = validateString(value, field, rules as ValidationRule);

    if (!result.valid && result.error) {
      errors[field] = result.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sanitize a string to prevent injection attacks
 * Note: This is a basic sanitizer. For HTML, use proper HTML escaping.
 */
export function sanitizeString(value: string): string {
  return value
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, 10000); // Hard limit to prevent DoS
}
