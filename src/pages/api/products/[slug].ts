import type { APIRoute } from 'astro';
import { pool } from '../../../lib/db';

/**
 * GET /api/products/[slug]
 * Fetch a product by slug with all related data
 */
export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;

  if (!slug) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: 'Product slug is required' },
      }),
      { status: 400 }
    );
  }

  const client = await pool.connect();

  try {
    // Fetch product with category info
    const productResult = await client.query(
      `
      SELECT
        p.*,
        c.name as "categoryName",
        c.slug as "categorySlug"
      FROM products p
      LEFT JOIN categories c ON c.id = p."categoryId"
      WHERE p.slug = $1 AND p."isActive" = true
    `,
      [slug]
    );

    if (productResult.rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { message: 'Product not found' },
        }),
        { status: 404 }
      );
    }

    const product = productResult.rows[0];

    // Fetch product images
    const imagesResult = await client.query(
      `
      SELECT * FROM "productImages"
      WHERE "productId" = $1
      ORDER BY "displayOrder", "createdAt"
    `,
      [product.id]
    );

    // Fetch price tiers
    const tiersResult = await client.query(
      `
      SELECT * FROM "priceTiers"
      WHERE "productId" = $1
      ORDER BY "displayOrder"
    `,
      [product.id]
    );

    // Fetch specifications
    const specsResult = await client.query(
      `
      SELECT * FROM "productSpecifications"
      WHERE "productId" = $1
      ORDER BY "displayOrder"
    `,
      [product.id]
    );

    // Fetch related products
    const relatedResult = await client.query(
      `
      SELECT
        p.id,
        p.slug,
        p.name,
        p."shortDescription",
        p."basePrice",
        p."compareAtPrice",
        p."isActive",
        pi.url as "imageUrl",
        pi."altText" as "imageAlt"
      FROM "relatedProducts" rp
      INNER JOIN products p ON rp."relatedProductId" = p.id
      LEFT JOIN LATERAL (
        SELECT url, "altText"
        FROM "productImages"
        WHERE "productId" = p.id AND "isPrimary" = true
        LIMIT 1
      ) pi ON true
      WHERE rp."productId" = $1 AND p."isActive" = true
      ORDER BY rp."displayOrder"
    `,
      [product.id]
    );

    // Fetch reviews stats
    const reviewStatsResult = await client.query(
      `
      SELECT
        AVG(rating)::decimal(3,2) as "averageRating",
        COUNT(id) as "reviewCount"
      FROM "productReviews"
      WHERE "productId" = $1 AND "isApproved" = true
    `,
      [product.id]
    );

    const stats = reviewStatsResult.rows[0];

    // Build response
    const productWithDetails = {
      ...product,
      basePrice: parseFloat(product.basePrice),
      compareAtPrice: product.compareAtPrice ? parseFloat(product.compareAtPrice) : undefined,
      images: imagesResult.rows,
      priceTiers: tiersResult.rows.map((t) => ({
        ...t,
        pricePerUnit: parseFloat(t.pricePerUnit),
        discountPercent: parseFloat(t.discountPercent),
      })),
      specifications: specsResult.rows,
      relatedProducts: relatedResult.rows.map((r) => ({
        ...r,
        basePrice: parseFloat(r.basePrice),
        compareAtPrice: r.compareAtPrice ? parseFloat(r.compareAtPrice) : undefined,
      })),
      averageRating: stats.averageRating ? parseFloat(stats.averageRating) : 0,
      reviewCount: parseInt(stats.reviewCount || 0),
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: productWithDetails,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
      }
    );
  } catch (error) {
    console.error('Error fetching product:', error);

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
