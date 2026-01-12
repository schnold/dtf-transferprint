import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';

/**
 * GET /api/categories/with-products
 * Fetch all active categories with their active products for navbar
 */
export const GET: APIRoute = async () => {
  const client = await pool.connect();

  try {
    // Fetch all active categories
    const categoriesResult = await client.query(`
      SELECT
        id,
        name,
        slug,
        "displayOrder",
        "parentId"
      FROM categories
      WHERE "isActive" = true
      ORDER BY "displayOrder", name
    `);

    // For each category, fetch its active products
    const categoriesWithProducts = await Promise.all(
      categoriesResult.rows.map(async (category) => {
        const productsResult = await client.query(`
          SELECT
            id,
            slug,
            name,
            "shortDescription",
            "basePrice",
            "isFeatured"
          FROM products
          WHERE "categoryId" = $1 AND "isActive" = true
          ORDER BY "isFeatured" DESC, name
        `, [category.id]);

        return {
          ...category,
          products: productsResult.rows.map(p => ({
            ...p,
            basePrice: parseFloat(p.basePrice),
          })),
        };
      })
    );

    // Organize into parent-child hierarchy
    const parentCategories = categoriesWithProducts.filter(c => !c.parentId);
    const childCategoriesMap = new Map();

    categoriesWithProducts.forEach(cat => {
      if (cat.parentId) {
        if (!childCategoriesMap.has(cat.parentId)) {
          childCategoriesMap.set(cat.parentId, []);
        }
        childCategoriesMap.get(cat.parentId).push(cat);
      }
    });

    const hierarchy = parentCategories.map(parent => ({
      ...parent,
      children: childCategoriesMap.get(parent.id) || [],
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: hierarchy,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        },
      }
    );
  } catch (error) {
    console.error('Error fetching categories with products:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
      }),
      { status: 500 }
    );
  } finally {
    client.release();
  }
};
