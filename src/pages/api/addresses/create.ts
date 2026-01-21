import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';
import { validateString, ValidationRules, sanitizeString } from '../../../lib/validation';

/**
 * POST /api/addresses/create
 * Create a new address for the user with input validation
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const client = await pool.connect();

  try {
    const user = locals.user;
    const userId = user?.id;

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Unauthorized - Please log in' },
        }),
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      addressType,
      isDefault,
      firstName,
      lastName,
      company,
      addressLine1,
      addressLine2,
      city,
      stateProvince,
      postalCode,
      country,
      phone,
    } = body;

    // Validate and sanitize inputs
    const validations = [
      validateString(firstName, 'First name', ValidationRules.NAME),
      validateString(lastName, 'Last name', ValidationRules.NAME),
      validateString(company, 'Company', ValidationRules.COMPANY),
      validateString(addressLine1, 'Address line 1', ValidationRules.ADDRESS_LINE),
      validateString(addressLine2, 'Address line 2', { maxLength: 255 }),
      validateString(city, 'City', ValidationRules.CITY),
      validateString(stateProvince, 'State/Province', { maxLength: 100 }),
      validateString(postalCode, 'Postal code', ValidationRules.POSTAL_CODE),
      validateString(phone, 'Phone', ValidationRules.PHONE),
    ];

    // Check for validation errors
    const errors = validations.filter(v => !v.valid);
    if (errors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: errors[0].error || 'Validation failed' },
        }),
        { status: 400 }
      );
    }

    // Sanitize string inputs
    const sanitizedData = {
      firstName: sanitizeString(firstName),
      lastName: sanitizeString(lastName),
      company: company ? sanitizeString(company) : null,
      addressLine1: sanitizeString(addressLine1),
      addressLine2: addressLine2 ? sanitizeString(addressLine2) : null,
      city: sanitizeString(city),
      stateProvince: stateProvince ? sanitizeString(stateProvince) : null,
      postalCode: sanitizeString(postalCode),
      country: (country || 'DE').toUpperCase(),
      phone: phone ? sanitizeString(phone) : null,
    };

    // If this is set as default, unset other defaults
    if (isDefault) {
      await client.query(
        `UPDATE "userAddresses" SET "isDefault" = false WHERE "userId" = $1 AND "addressType" = $2`,
        [userId, addressType || 'both']
      );
    }

    const result = await client.query(
      `
      INSERT INTO "userAddresses" (
        id, "userId", "addressType", "isDefault", "firstName", "lastName",
        company, "addressLine1", "addressLine2", city, "stateProvince",
        "postalCode", country, phone
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *
    `,
      [
        userId,
        addressType || 'both',
        isDefault || false,
        sanitizedData.firstName,
        sanitizedData.lastName,
        sanitizedData.company,
        sanitizedData.addressLine1,
        sanitizedData.addressLine2,
        sanitizedData.city,
        sanitizedData.stateProvince,
        sanitizedData.postalCode,
        sanitizedData.country,
        sanitizedData.phone,
      ]
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: { address: result.rows[0] },
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating address:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Failed to create address',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500 }
    );
  } finally {
    client.release();
  }
};
