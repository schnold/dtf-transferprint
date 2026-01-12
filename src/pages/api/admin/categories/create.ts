import type { APIRoute } from 'astro';
import { pool } from '../../../../lib/db';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check if user is admin
    const session = locals.session;
    if (!session?.user?.isAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Unauthorized - Admin access required' },
        }),
        { status: 403 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.slug) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Name and slug are required' },
        }),
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Check if slug already exists
      const existingSlug = await client.query(
        'SELECT id FROM categories WHERE slug = $1',
        [data.slug]
      );

      if (existingSlug.rows.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: 'A category with this slug already exists' },
          }),
          { status: 400 }
        );
      }

      // Insert category
      const result = await client.query(
        `
        INSERT INTO categories (
          id,
          name,
          slug,
          description,
          "parentId",
          "displayOrder",
          "imageUrl",
          "isActive"
        ) VALUES (
          gen_random_uuid()::text,
          $1, $2, $3, $4, $5, $6, $7
        ) RETURNING id
      `,
        [
          data.name,
          data.slug,
          data.description || null,
          data.parentId || null,
          data.displayOrder || 0,
          data.imageUrl || null,
          data.isActive !== false,
        ]
      );

      return new Response(
        JSON.stringify({
          success: true,
          data: { categoryId: result.rows[0].id },
        }),
        { status: 201 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating category:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error.message || 'Failed to create category',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      }),
      { status: 500 }
    );
  }
};
