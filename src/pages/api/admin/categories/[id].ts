import type { APIRoute } from 'astro';
import { pool } from '../../../../lib/db';

export const DELETE: APIRoute = async ({ params, locals }) => {
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

    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Category ID is required' },
        }),
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Check if category has products
      const productsCheck = await client.query(
        'SELECT COUNT(*) as count FROM products WHERE "categoryId" = $1',
        [id]
      );

      if (parseInt(productsCheck.rows[0].count) > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              message: 'Cannot delete category with products. Please reassign or delete the products first.',
            },
          }),
          { status: 400 }
        );
      }

      // Check if category has subcategories
      const subcategoriesCheck = await client.query(
        'SELECT COUNT(*) as count FROM categories WHERE "parentId" = $1',
        [id]
      );

      if (parseInt(subcategoriesCheck.rows[0].count) > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              message: 'Cannot delete category with subcategories. Please delete subcategories first.',
            },
          }),
          { status: 400 }
        );
      }

      // Delete category
      await client.query('DELETE FROM categories WHERE id = $1', [id]);

      return new Response(
        JSON.stringify({
          success: true,
        }),
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting category:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error.message || 'Failed to delete category',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      }),
      { status: 500 }
    );
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
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

    const { id } = params;
    const data = await request.json();

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Category ID is required' },
        }),
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // Check if category exists
      const existing = await client.query('SELECT id FROM categories WHERE id = $1', [id]);

      if (existing.rows.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: { message: 'Category not found' },
          }),
          { status: 404 }
        );
      }

      // Check if slug is taken by another category
      if (data.slug) {
        const slugCheck = await client.query(
          'SELECT id FROM categories WHERE slug = $1 AND id != $2',
          [data.slug, id]
        );

        if (slugCheck.rows.length > 0) {
          return new Response(
            JSON.stringify({
              success: false,
              error: { message: 'A category with this slug already exists' },
            }),
            { status: 400 }
          );
        }
      }

      // Update category
      await client.query(
        `
        UPDATE categories
        SET
          name = COALESCE($1, name),
          slug = COALESCE($2, slug),
          description = COALESCE($3, description),
          "parentId" = $4,
          "displayOrder" = COALESCE($5, "displayOrder"),
          icon = $6,
          "imageUrl" = $7,
          "isActive" = COALESCE($8, "isActive"),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $9
      `,
        [
          data.name,
          data.slug,
          data.description,
          data.parentId,
          data.displayOrder,
          data.icon,
          data.imageUrl,
          data.isActive,
          id,
        ]
      );

      return new Response(
        JSON.stringify({
          success: true,
        }),
        { status: 200 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating category:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error.message || 'Failed to update category',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
      }),
      { status: 500 }
    );
  }
};
