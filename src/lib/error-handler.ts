/**
 * Secure error handling utilities
 * Prevents information disclosure while maintaining useful error messages
 */

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}

/**
 * Safe error messages for production
 * Never expose internal details, stack traces, or sensitive information
 */
const SAFE_ERROR_MESSAGES: Record<string, string> = {
  // Database errors
  database: 'A database error occurred. Please try again later.',
  connection: 'Unable to connect to the service. Please try again later.',

  // Payment errors
  payment: 'Payment processing failed. Please try again or contact support.',
  paypal: 'PayPal service error. Please try again later.',

  // Authentication errors
  auth: 'Authentication failed. Please log in and try again.',
  unauthorized: 'You are not authorized to perform this action.',

  // Validation errors
  validation: 'Invalid input provided. Please check your data and try again.',

  // Generic errors
  generic: 'An unexpected error occurred. Please try again later.',
};

/**
 * Create a safe error response for API endpoints
 * @param error - The error object
 * @param errorType - Type of error for categorization
 * @param statusCode - HTTP status code
 * @returns JSON response object
 */
export function createSafeErrorResponse(
  error: unknown,
  errorType: keyof typeof SAFE_ERROR_MESSAGES = 'generic',
  statusCode: number = 500
): Response {
  // Log the full error for debugging (server-side only)
  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', {
      type: errorType,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
  } else {
    // In production, log minimal information
    console.error('[ERROR]', {
      type: errorType,
      timestamp: new Date().toISOString(),
    });
  }

  // Return safe error message
  const response = {
    success: false,
    error: {
      message: SAFE_ERROR_MESSAGES[errorType],
      code: errorType.toUpperCase(),
    },
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create an error response with a custom message (for validation errors)
 * Only use this when the error message is safe to expose (e.g., user input validation)
 * @param message - Safe error message
 * @param statusCode - HTTP status code
 * @returns JSON response object
 */
export function createValidationErrorResponse(
  message: string,
  statusCode: number = 400
): Response {
  const response = {
    success: false,
    error: {
      message: sanitizeErrorMessage(message),
      code: 'VALIDATION_ERROR',
    },
  };

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Sanitize error messages to prevent information disclosure
 * Removes file paths, database details, and other sensitive information
 */
function sanitizeErrorMessage(message: string): string {
  // Remove file paths (Windows and Unix)
  message = message.replace(/[A-Za-z]:\\[^:"\n]+/g, '[PATH]');
  message = message.replace(/\/[^\s:"\n]+\/(src|lib|node_modules)[^\s:"\n]*/g, '[PATH]');

  // Remove database connection strings
  message = message.replace(/postgresql:\/\/[^\s]+/g, '[DATABASE]');
  message = message.replace(/mongodb:\/\/[^\s]+/g, '[DATABASE]');

  // Remove IP addresses
  message = message.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');

  // Remove email addresses (except in validation contexts)
  message = message.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

  // Truncate if too long
  if (message.length > 200) {
    message = message.substring(0, 197) + '...';
  }

  return message;
}

/**
 * Categorize errors by type for appropriate handling
 */
export function categorizeError(error: unknown): keyof typeof SAFE_ERROR_MESSAGES {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('database') || message.includes('query')) {
      return 'database';
    }
    if (message.includes('connection') || message.includes('timeout')) {
      return 'connection';
    }
    if (message.includes('paypal') || message.includes('payment')) {
      return 'payment';
    }
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'unauthorized';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
  }

  return 'generic';
}

/**
 * Wrapper for try-catch blocks that returns safe error responses
 * @param fn - Async function to execute
 * @param errorType - Type of error for categorization
 * @returns Promise with either result or error response
 */
export async function withErrorHandler<T>(
  fn: () => Promise<T>,
  errorType: keyof typeof SAFE_ERROR_MESSAGES = 'generic'
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const category = categorizeError(error);
    throw createSafeErrorResponse(error, category);
  }
}
