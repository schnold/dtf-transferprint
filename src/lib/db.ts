import { Pool } from "pg";
import "dotenv/config";

// Neon PostgreSQL connection pool with secure SSL configuration
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE,
  // Neon requires SSL, and we trust their certificates
  ssl: process.env.NODE_ENV === 'production' ? true : {
    rejectUnauthorized: false, // Only disabled in development for easier local testing
  },
});

// Allowlist of trusted shipping carrier domains for tracking URLs
const TRUSTED_TRACKING_DOMAINS = [
  'dhl.de',
  'dhl.com',
  'deutschepost.de',
  'dpd.de',
  'dpd.com',
  'hermes.de',
  'hermes-europe.de',
  'gls-group.eu',
  'ups.com',
  'fedex.com',
  'usps.com',
  '17track.net', // Popular tracking aggregator
  'track.global', // Another tracking aggregator
];

/**
 * Validates that a tracking URL is from a trusted shipping carrier
 * Prevents open redirect and phishing attacks
 */
function validateTrackingUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Must be HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return false;
    }

    // Check if hostname matches any trusted domain (including subdomains)
    const hostname = parsedUrl.hostname.toLowerCase();
    const isAllowed = TRUSTED_TRACKING_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );

    return isAllowed;
  } catch {
    // Invalid URL format
    return false;
  }
}

export interface AnalyticsData {
  totalUsers: number;
  totalAdmins: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  lockedAccounts: number;
  recentSignups: number; // Last 7 days
  totalSessions: number;
  activeSessions: number;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
  accountLocked: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  gewerbebetreiber: boolean;
  umsatzsteuernummer: string | null;
  discountPercent: number;
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const client = await pool.connect();
  try {
    // Get user statistics
    const userStats = await client.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE "isAdmin" = true) as total_admins,
        COUNT(*) FILTER (WHERE "emailVerified" = true) as verified_users,
        COUNT(*) FILTER (WHERE "emailVerified" = false) as unverified_users,
        COUNT(*) FILTER (WHERE "accountLocked" = true) as locked_accounts,
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days') as recent_signups
      FROM "user"
    `);

    // Get session statistics
    const sessionStats = await client.query(`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE "expiresAt" > NOW()) as active_sessions
      FROM "session"
    `);

    return {
      totalUsers: parseInt(userStats.rows[0].total_users),
      totalAdmins: parseInt(userStats.rows[0].total_admins),
      verifiedUsers: parseInt(userStats.rows[0].verified_users),
      unverifiedUsers: parseInt(userStats.rows[0].unverified_users),
      lockedAccounts: parseInt(userStats.rows[0].locked_accounts),
      recentSignups: parseInt(userStats.rows[0].recent_signups),
      totalSessions: parseInt(sessionStats.rows[0].total_sessions),
      activeSessions: parseInt(sessionStats.rows[0].active_sessions),
    };
  } finally {
    client.release();
  }
}

export async function getAllUsers(): Promise<UserData[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        id,
        name,
        email,
        "emailVerified",
        "isAdmin",
        "accountLocked",
        "createdAt",
        "lastLoginAt",
        "gewerbebetreiber",
        "umsatzsteuernummer",
        "discountPercent"
      FROM "user"
      ORDER BY "createdAt" DESC
    `);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      emailVerified: row.emailVerified,
      isAdmin: row.isAdmin,
      accountLocked: row.accountLocked,
      createdAt: new Date(row.createdAt),
      lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt) : null,
      gewerbebetreiber: row.gewerbebetreiber ?? false,
      umsatzsteuernummer: row.umsatzsteuernummer ?? null,
      discountPercent: parseFloat(row.discountPercent) || 0,
    }));
  } finally {
    client.release();
  }
}

export async function getUserById(userId: string): Promise<UserData | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        id,
        name,
        email,
        "emailVerified",
        "isAdmin",
        "accountLocked",
        "createdAt",
        "lastLoginAt",
        "gewerbebetreiber",
        "umsatzsteuernummer",
        "discountPercent"
      FROM "user"
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      emailVerified: row.emailVerified,
      isAdmin: row.isAdmin,
      accountLocked: row.accountLocked,
      createdAt: new Date(row.createdAt),
      lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt) : null,
      gewerbebetreiber: row.gewerbebetreiber ?? false,
      umsatzsteuernummer: row.umsatzsteuernummer ?? null,
      discountPercent: parseFloat(row.discountPercent) || 0,
    };
  } finally {
    client.release();
  }
}

export async function updateUserDiscount(userId: string, discountPercent: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE "user"
      SET "discountPercent" = $2
      WHERE id = $1
    `, [userId, discountPercent]);
  } finally {
    client.release();
  }
}

// Ecommerce Interfaces
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  displayOrder: number;
  isActive: boolean;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductSpecification {
  specKey: string;
  specLabel: string;
  specValue: string;
}

export interface ProductWithDetails {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  categoryName?: string;
  basePrice: number;
  compareAtPrice?: number;
  sku?: string;
  inventoryQuantity: number;
  isActive: boolean;
  isFeatured: boolean;
  images: string[];
  specifications: Record<string, string>;
  tags: string[];
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemWithDetails {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  currentPrice: number;
  customOptions?: any;
  uploadedFileUrl?: string;
  uploadedFileName?: string;
  fileMetadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  id: string;
  userId: string;
  addressType: 'shipping' | 'billing' | 'both';
  isDefault: boolean;
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince?: string;
  postalCode: string;
  country: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Discount {
  id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping';
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageCount: number;
  usageLimitPerUser?: number;
  appliesTo: 'all' | 'specific_products' | 'specific_categories';
  isActive: boolean;
  startsAt: Date;
  endsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  fulfillmentStatus: 'unfulfilled' | 'partial' | 'fulfilled';
  currency: string;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
  discountCode?: string;
  discountId?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingAddressId?: string;
  billingAddressId?: string;
  customerNote?: string;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customOptions?: any;
  uploadedFileUrl?: string;
  uploadedFileName?: string;
  fileMetadata?: any;
  createdAt: Date;
}

export interface OrderWithDetails extends Order {
  items: OrderItem[];
  statusHistory: OrderStatusHistoryItem[];
  shippingAddress?: Address;
  billingAddress?: Address;
}

export interface OrderStatusHistoryItem {
  id: string;
  orderId: string;
  status: string;
  note?: string;
  notifiedCustomer: boolean;
  createdByUserId?: string;
  createdAt: Date;
}

// Product Management Functions
export async function getProduct(slugOrId: string): Promise<ProductWithDetails | null> {
  const client = await pool.connect();
  try {
    const productResult = await client.query(`
      SELECT
        p.*,
        c.name as "categoryName",
        COALESCE(AVG(pr.rating), 0) as "averageRating",
        COUNT(pr.id) as "reviewCount"
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN "productReviews" pr ON p.id = pr."productId" AND pr."isApproved" = true
      WHERE p.slug = $1 OR p.id = $1
      GROUP BY p.id, c.name
    `, [slugOrId]);

    if (productResult.rows.length === 0) return null;
    const product = productResult.rows[0];

    const imagesResult = await client.query(`
      SELECT url FROM "productImages"
      WHERE "productId" = $1
      ORDER BY "displayOrder", "createdAt"
    `, [product.id]);

    const specsResult = await client.query(`
      SELECT "specKey", "specValue"
      FROM "productSpecifications"
      WHERE "productId" = $1
      ORDER BY "displayOrder"
    `, [product.id]);

    const tagsResult = await client.query(`
      SELECT pt.name
      FROM "productTags" pt
      JOIN "productTagRelations" ptr ON pt.id = ptr."tagId"
      WHERE ptr."productId" = $1
    `, [product.id]);

    return {
      ...product,
      basePrice: parseFloat(product.basePrice),
      compareAtPrice: product.compareAtPrice ? parseFloat(product.compareAtPrice) : undefined,
      images: imagesResult.rows.map(r => r.url),
      specifications: Object.fromEntries(
        specsResult.rows.map(r => [r.specKey, r.specValue])
      ),
      tags: tagsResult.rows.map(r => r.name),
      averageRating: parseFloat(product.averageRating),
      reviewCount: parseInt(product.reviewCount),
    };
  } finally {
    client.release();
  }
}

export async function getProducts(filters?: {
  categoryId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ProductWithDetails[]> {
  const client = await pool.connect();
  try {
    let query = `
      SELECT
        p.*,
        c.name as "categoryName",
        COALESCE(AVG(pr.rating), 0) as "averageRating",
        COUNT(pr.id) as "reviewCount"
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN "productReviews" pr ON p.id = pr."productId" AND pr."isApproved" = true
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.categoryId) {
      query += ` AND p."categoryId" = $${paramIndex++}`;
      params.push(filters.categoryId);
    }
    if (filters?.isActive !== undefined) {
      query += ` AND p."isActive" = $${paramIndex++}`;
      params.push(filters.isActive);
    }
    if (filters?.isFeatured !== undefined) {
      query += ` AND p."isFeatured" = $${paramIndex++}`;
      params.push(filters.isFeatured);
    }

    query += ` GROUP BY p.id, c.name ORDER BY p."createdAt" DESC`;

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }
    if (filters?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await client.query(query, params);

    const products = await Promise.all(result.rows.map(async (product) => {
      const imagesResult = await client.query(`
        SELECT url FROM "productImages"
        WHERE "productId" = $1
        ORDER BY "displayOrder", "createdAt"
      `, [product.id]);

      const specsResult = await client.query(`
        SELECT "specKey", "specValue"
        FROM "productSpecifications"
        WHERE "productId" = $1
        ORDER BY "displayOrder"
      `, [product.id]);

      const tagsResult = await client.query(`
        SELECT pt.name
        FROM "productTags" pt
        JOIN "productTagRelations" ptr ON pt.id = ptr."tagId"
        WHERE ptr."productId" = $1
      `, [product.id]);

      return {
        ...product,
        basePrice: parseFloat(product.basePrice),
        compareAtPrice: product.compareAtPrice ? parseFloat(product.compareAtPrice) : undefined,
        images: imagesResult.rows.map(r => r.url),
        specifications: Object.fromEntries(
          specsResult.rows.map(r => [r.specKey, r.specValue])
        ),
        tags: tagsResult.rows.map(r => r.name),
        averageRating: parseFloat(product.averageRating),
        reviewCount: parseInt(product.reviewCount),
      };
    }));

    return products;
  } finally {
    client.release();
  }
}

// Cart Management Functions
export async function getCart(userId: string): Promise<CartItemWithDetails[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        ci.*,
        p.name as "productName",
        p.slug as "productSlug",
        p."basePrice" as "currentPrice",
        COALESCE(
          (SELECT url FROM "productImages" WHERE "productId" = p.id AND "isPrimary" = true LIMIT 1),
          (SELECT url FROM "productImages" WHERE "productId" = p.id ORDER BY "displayOrder", "createdAt" LIMIT 1)
        ) as "productImage"
      FROM "cartItems" ci
      JOIN products p ON ci."productId" = p.id
      WHERE ci."userId" = $1
      ORDER BY ci."createdAt" DESC
    `, [userId]);

    return result.rows.map(row => ({
      ...row,
      unitPrice: parseFloat(row.unitPrice),
      currentPrice: parseFloat(row.currentPrice),
    }));
  } finally {
    client.release();
  }
}

export async function addToCart(
  userId: string,
  productId: string,
  quantity: number,
  customOptions?: any
): Promise<CartItemWithDetails> {
  const client = await pool.connect();
  try {
    const priceResult = await client.query(
      'SELECT "basePrice" FROM products WHERE id = $1',
      [productId]
    );
    const unitPrice = priceResult.rows[0]?.basePrice;

    if (!unitPrice) throw new Error('Product not found');

    const result = await client.query(`
      INSERT INTO "cartItems" (id, "userId", "productId", quantity, "unitPrice", "customOptions")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)
      ON CONFLICT ("userId", "productId")
      DO UPDATE SET
        quantity = "cartItems".quantity + $3,
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING *
    `, [userId, productId, quantity, unitPrice, customOptions]);

    const cartItems = await getCart(userId);
    return cartItems.find(item => item.id === result.rows[0].id)!;
  } finally {
    client.release();
  }
}

export async function updateCartItem(cartItemId: string, quantity: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE "cartItems"
      SET quantity = $2, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [cartItemId, quantity]);
  } finally {
    client.release();
  }
}

export async function removeFromCart(cartItemId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM "cartItems" WHERE id = $1', [cartItemId]);
  } finally {
    client.release();
  }
}

export async function clearCart(userId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM "cartItems" WHERE "userId" = $1', [userId]);
  } finally {
    client.release();
  }
}

// Discount Functions
export async function validateDiscount(
  code: string,
  userId: string,
  cartItems: CartItemWithDetails[]
): Promise<{valid: boolean; discount?: Discount; error?: string}> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM discounts
      WHERE code = $1
        AND "isActive" = true
        AND "startsAt" <= CURRENT_TIMESTAMP
        AND ("endsAt" IS NULL OR "endsAt" > CURRENT_TIMESTAMP)
    `, [code]);

    if (result.rows.length === 0) {
      return {valid: false, error: 'Invalid or expired discount code'};
    }

    const discount = result.rows[0];

    if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
      return {valid: false, error: 'Discount code has reached its usage limit'};
    }

    if (discount.usageLimitPerUser) {
      const usageResult = await client.query(
        'SELECT COUNT(*) as count FROM "discountUsage" WHERE "discountId" = $1 AND "userId" = $2',
        [discount.id, userId]
      );
      if (parseInt(usageResult.rows[0].count) >= discount.usageLimitPerUser) {
        return {valid: false, error: 'You have already used this discount code'};
      }
    }

    if (discount.appliesTo === 'specific_products') {
      const eligibleProducts = await client.query(
        'SELECT "productId" FROM "discountProductEligibility" WHERE "discountId" = $1',
        [discount.id]
      );
      const eligibleIds = eligibleProducts.rows.map(r => r.productId);
      const hasEligible = cartItems.some(item => eligibleIds.includes(item.productId));

      if (!hasEligible) {
        return {valid: false, error: 'No eligible products in cart'};
      }
    }

    return {valid: true, discount};
  } finally {
    client.release();
  }
}

export async function calculateDiscount(discount: Discount, subtotal: number): Promise<number> {
  if (discount.discountType === 'percentage') {
    let amount = subtotal * (discount.discountValue / 100);
    if (discount.maxDiscountAmount) {
      amount = Math.min(amount, discount.maxDiscountAmount);
    }
    return amount;
  } else if (discount.discountType === 'fixed_amount') {
    return Math.min(discount.discountValue, subtotal);
  }
  return 0;
}

// Order Functions
export async function createOrder(
  userId: string,
  shippingAddressId: string,
  billingAddressId: string,
  options?: {
    discountCode?: string;
    userDiscountPercent?: number;
    paypalOrderId?: string;
    paypalCaptureId?: string;
    shippingProfileId?: string;
    shippingCost?: number;
    subtotal?: number;
    userDiscountAmount?: number;
    campaignDiscountAmount?: number;
    taxAmount?: number;
    total?: number;
  }
): Promise<Order> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cartResult = await client.query(
      'SELECT * FROM "cartItems" WHERE "userId" = $1',
      [userId]
    );

    if (cartResult.rows.length === 0) {
      throw new Error('Cart is empty');
    }

    // If amounts are provided (from PayPal session), use them
    // Otherwise calculate them (for backward compatibility)
    let subtotal = options?.subtotal ?? 0;
    let userDiscountAmount = options?.userDiscountAmount ?? 0;
    let campaignDiscountAmount = options?.campaignDiscountAmount ?? 0;
    let shippingCost = options?.shippingCost ?? 0;
    let taxAmount = options?.taxAmount ?? 0;
    let total = options?.total ?? 0;
    let discountId: string | null = null;

    if (!options?.subtotal) {
      // Calculate subtotal if not provided
      for (const item of cartResult.rows) {
        const itemSubtotal = parseFloat(item.unitPrice) * item.quantity;

        // Add zusatzleistungen total for this cart item
        const servicesResult = await client.query(
          'SELECT SUM(price) as total FROM "cartItemZusatzleistungen" WHERE "cartItemId" = $1',
          [item.id]
        );
        const servicesTotal = parseFloat(servicesResult.rows[0]?.total || 0);

        subtotal += itemSubtotal + servicesTotal;
      }

      // Apply user discount if provided
      const userDiscountPercent = options?.userDiscountPercent ?? 0;
      userDiscountAmount = subtotal * (userDiscountPercent / 100);
      const subtotalAfterUserDiscount = subtotal - userDiscountAmount;

      // Apply campaign discount if provided
      if (options?.discountCode) {
        const cartItems = await getCart(userId);
        const validation = await validateDiscount(options.discountCode, userId, cartItems);
        if (validation.valid && validation.discount) {
          const discount = validation.discount;
          discountId = discount.id;

          if (discount.discountType === 'free_shipping') {
            shippingCost = 0;
          } else {
            campaignDiscountAmount = await calculateDiscount(discount, subtotalAfterUserDiscount);
          }
        }
      }

      // Get shipping cost if not provided
      if (!options?.shippingCost) {
        if (options?.shippingProfileId) {
          const shippingResult = await client.query(
            'SELECT "basePrice", "freeShippingThreshold" FROM "shippingProfiles" WHERE id = $1',
            [options.shippingProfileId]
          );

          if (shippingResult.rows.length > 0) {
            const shipping = shippingResult.rows[0];
            const freeShippingThreshold = shipping.freeShippingThreshold
              ? parseFloat(shipping.freeShippingThreshold)
              : null;

            // Check if free shipping applies
            const finalSubtotal = subtotalAfterUserDiscount - campaignDiscountAmount;
            if (freeShippingThreshold && finalSubtotal >= freeShippingThreshold) {
              shippingCost = 0;
            } else {
              shippingCost = parseFloat(shipping.basePrice);
            }
          }
        } else {
          shippingCost = 5.99; // Fallback default
        }
      }

      // Calculate tax and total
      const taxableAmount = subtotalAfterUserDiscount - campaignDiscountAmount + shippingCost;
      taxAmount = taxableAmount * 0.19;
      total = taxableAmount + taxAmount;
    } else {
      // When using pre-calculated amounts (PayPal flow), still need to look up discount ID
      if (options?.discountCode && !discountId) {
        const discountResult = await client.query(
          'SELECT id FROM discounts WHERE code = $1',
          [options.discountCode]
        );
        if (discountResult.rows.length > 0) {
          discountId = discountResult.rows[0].id;
        }
      }
    }

    const totalDiscountAmount = userDiscountAmount + campaignDiscountAmount;
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const orderResult = await client.query(`
      INSERT INTO orders (
        id, "orderNumber", "userId", subtotal, "discountAmount",
        "shippingCost", "taxAmount", total, "discountCode", "discountId",
        "shippingAddressId", "billingAddressId", "userDiscountPercent",
        "paypalOrderId", "paypalCaptureId", "shippingProfileId"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING *
    `, [
      orderNumber, userId, subtotal, totalDiscountAmount,
      shippingCost, taxAmount, total, options?.discountCode || null, null,
      shippingAddressId, billingAddressId, options?.userDiscountPercent || 0,
      options?.paypalOrderId || null, options?.paypalCaptureId || null,
      options?.shippingProfileId || null
    ]);

    const order = orderResult.rows[0];

    for (const item of cartResult.rows) {
      const productResult = await client.query(
        'SELECT name, sku FROM products WHERE id = $1',
        [item.productId]
      );

      const orderItemResult = await client.query(`
        INSERT INTO "orderItems" (
          id, "orderId", "productId", "productName", sku,
          quantity, "unitPrice", "totalPrice", "customOptions",
          "uploadedFileUrl", "uploadedFileName", "fileMetadata"
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        )
        RETURNING id
      `, [
        order.id, item.productId, productResult.rows[0].name,
        productResult.rows[0].sku, item.quantity,
        item.unitPrice, parseFloat(item.unitPrice) * item.quantity,
        item.customOptions,
        item.uploadedFileUrl || null,
        item.uploadedFileName || null,
        item.fileMetadata || null
      ]);

      const orderItemId = orderItemResult.rows[0].id;

      // Insert zusatzleistungen for this order item
      const zusatzleistungenResult = await client.query(`
        SELECT ciz.price, z.name, z.description
        FROM "cartItemZusatzleistungen" ciz
        INNER JOIN "zusatzleistungen" z ON ciz."zusatzleistungId" = z.id
        WHERE ciz."cartItemId" = $1
      `, [item.id]);

      for (const service of zusatzleistungenResult.rows) {
        await client.query(`
          INSERT INTO "orderItemZusatzleistungen"
            (id, "orderItemId", "zusatzleistungName", "zusatzleistungDescription", price)
          VALUES (gen_random_uuid()::text, $1, $2, $3, $4)
        `, [orderItemId, service.name, service.description, service.price]);
      }

      await client.query(`
        UPDATE products
        SET "inventoryQuantity" = "inventoryQuantity" - $2
        WHERE id = $1
      `, [item.productId, item.quantity]);
    }

    if (discountId) {
      await client.query(`
        INSERT INTO "discountUsage" (id, "discountId", "userId", "orderId")
        VALUES (gen_random_uuid()::text, $1, $2, $3)
      `, [discountId, userId, order.id]);

      await client.query(`
        UPDATE discounts
        SET "usageCount" = "usageCount" + 1
        WHERE id = $1
      `, [discountId]);
    }

    await client.query(`
      INSERT INTO "orderStatusHistory" (id, "orderId", status)
      VALUES (gen_random_uuid()::text, $1, 'pending')
    `, [order.id]);

    await client.query('DELETE FROM "cartItems" WHERE "userId" = $1', [userId]);

    await client.query('COMMIT');
    return order;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getOrder(orderId: string): Promise<OrderWithDetails | null> {
  const client = await pool.connect();
  try {
    const orderResult = await client.query(`
      SELECT o.* FROM orders o
      WHERE o.id = $1 OR o."orderNumber" = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) return null;
    const order = orderResult.rows[0];

    const itemsResult = await client.query(`
      SELECT * FROM "orderItems" WHERE "orderId" = $1
    `, [order.id]);

    const historyResult = await client.query(`
      SELECT * FROM "orderStatusHistory"
      WHERE "orderId" = $1
      ORDER BY "createdAt" DESC
    `, [order.id]);

    return {
      ...order,
      subtotal: parseFloat(order.subtotal),
      discountAmount: parseFloat(order.discountAmount),
      shippingCost: parseFloat(order.shippingCost),
      taxAmount: parseFloat(order.taxAmount),
      total: parseFloat(order.total),
      items: itemsResult.rows.map(item => ({
        ...item,
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.totalPrice),
      })),
      statusHistory: historyResult.rows,
    };
  } finally {
    client.release();
  }
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        o.*,
        COUNT(oi.id) as "itemCount"
      FROM orders o
      LEFT JOIN "orderItems" oi ON o.id = oi."orderId"
      WHERE o."userId" = $1
      GROUP BY o.id
      ORDER BY o."createdAt" DESC
    `, [userId]);

    return result.rows.map(row => ({
      ...row,
      subtotal: parseFloat(row.subtotal),
      discountAmount: parseFloat(row.discountAmount),
      shippingCost: parseFloat(row.shippingCost),
      taxAmount: parseFloat(row.taxAmount),
      total: parseFloat(row.total),
    }));
  } finally {
    client.release();
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  note?: string,
  updatedByUserId?: string
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateFields: string[] = ['status = $2', '"updatedAt" = CURRENT_TIMESTAMP'];
    const params: any[] = [orderId, status];
    let paramIndex = 3;

    if (status === 'shipped') {
      updateFields.push(`"shippedAt" = $${paramIndex++}`);
      params.push(new Date());
    } else if (status === 'delivered') {
      updateFields.push(`"deliveredAt" = $${paramIndex++}`);
      params.push(new Date());
    } else if (status === 'cancelled') {
      updateFields.push(`"cancelledAt" = $${paramIndex++}`);
      params.push(new Date());
    }

    await client.query(`
      UPDATE orders
      SET ${updateFields.join(', ')}
      WHERE id = $1
    `, params);

    await client.query(`
      INSERT INTO "orderStatusHistory" (id, "orderId", status, note, "createdByUserId")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4)
    `, [orderId, status, note, updatedByUserId]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Admin Order Management Functions
export async function getAllOrders(filters?: {
  status?: string;
  fulfillmentStatus?: string;
  paymentStatus?: string;
  limit?: number;
  offset?: number;
}): Promise<{ orders: any[], totalCount: number }> {
  const client = await pool.connect();
  try {
    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status && filters.status !== 'all') {
      whereConditions.push(`o.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters?.fulfillmentStatus && filters.fulfillmentStatus !== 'all') {
      whereConditions.push(`o."fulfillmentStatus" = $${paramIndex++}`);
      params.push(filters.fulfillmentStatus);
    }

    if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
      whereConditions.push(`o."paymentStatus" = $${paramIndex++}`);
      params.push(filters.paymentStatus);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countResult = await client.query(`
      SELECT COUNT(*) as total
      FROM orders o
      ${whereClause}
    `, params);
    const totalCount = parseInt(countResult.rows[0].total);

    // Get orders with user info
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    params.push(limit);
    params.push(offset);

    const result = await client.query(`
      SELECT
        o.*,
        u.name as "userName",
        u.email as "userEmail",
        COUNT(oi.id) as "itemCount",
        CONCAT(
          sa."firstName", ' ', sa."lastName", ', ',
          sa."addressLine1", ', ',
          sa."postalCode", ' ', sa.city
        ) as "shippingAddressFormatted"
      FROM orders o
      LEFT JOIN "user" u ON o."userId" = u.id
      LEFT JOIN "orderItems" oi ON o.id = oi."orderId"
      LEFT JOIN "userAddresses" sa ON o."shippingAddressId" = sa.id
      ${whereClause}
      GROUP BY o.id, u.id, sa.id
      ORDER BY o."createdAt" DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, params);

    const orders = result.rows.map(row => ({
      ...row,
      subtotal: parseFloat(row.subtotal),
      discountAmount: parseFloat(row.discountAmount),
      shippingCost: parseFloat(row.shippingCost),
      taxAmount: parseFloat(row.taxAmount),
      total: parseFloat(row.total),
      itemCount: parseInt(row.itemCount) || 0,
    }));

    return { orders, totalCount };
  } finally {
    client.release();
  }
}

export async function getOrderWithDetails(orderId: string): Promise<{
  order: any;
  user: any;
  items: any[];
  statusHistory: any[];
  shippingAddress: any;
  billingAddress: any;
} | null> {
  const client = await pool.connect();
  try {
    // Get order
    const orderResult = await client.query(`
      SELECT * FROM orders WHERE id = $1 OR "orderNumber" = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) return null;
    const order = orderResult.rows[0];

    // Get user
    const userResult = await client.query(`
      SELECT id, name, email, "isAdmin", "discountPercent"
      FROM "user"
      WHERE id = $1
    `, [order.userId]);
    const user = userResult.rows[0] || null;

    // Get order items
    const itemsResult = await client.query(`
      SELECT * FROM "orderItems" WHERE "orderId" = $1
    `, [order.id]);

    // Get status history
    const historyResult = await client.query(`
      SELECT
        osh.*,
        u.name as "createdByUserName"
      FROM "orderStatusHistory" osh
      LEFT JOIN "user" u ON osh."createdByUserId" = u.id
      WHERE osh."orderId" = $1
      ORDER BY osh."createdAt" DESC
    `, [order.id]);

    // Get addresses
    const shippingAddressResult = await client.query(`
      SELECT * FROM "userAddresses" WHERE id = $1
    `, [order.shippingAddressId]);

    const billingAddressResult = await client.query(`
      SELECT * FROM "userAddresses" WHERE id = $1
    `, [order.billingAddressId]);

    return {
      order: {
        ...order,
        subtotal: parseFloat(order.subtotal),
        discountAmount: parseFloat(order.discountAmount),
        shippingCost: parseFloat(order.shippingCost),
        taxAmount: parseFloat(order.taxAmount),
        total: parseFloat(order.total),
      },
      user,
      items: itemsResult.rows.map(item => ({
        ...item,
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.totalPrice),
      })),
      statusHistory: historyResult.rows,
      shippingAddress: shippingAddressResult.rows[0] || null,
      billingAddress: billingAddressResult.rows[0] || null,
    };
  } finally {
    client.release();
  }
}

export async function updateOrderStatusWithTracking(
  orderId: string,
  status: string,
  options?: {
    fulfillmentStatus?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    note?: string;
    updatedByUserId?: string;
    sendEmail?: boolean;
  }
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate tracking info for shipped status
    if (status === 'shipped') {
      if (!options?.trackingNumber || !options?.trackingUrl) {
        throw new Error('Tracking number and URL are required for shipped status');
      }
      // Validate tracking URL is from a trusted carrier (prevents phishing)
      if (!validateTrackingUrl(options.trackingUrl)) {
        throw new Error('Tracking URL must be HTTPS and from a trusted shipping carrier');
      }
    }

    const updateFields: string[] = ['"updatedAt" = CURRENT_TIMESTAMP'];
    const params: any[] = [orderId];
    let paramIndex = 2;

    // Update status if provided
    if (status) {
      updateFields.push(`status = $${paramIndex++}`);
      params.push(status);

      // Set timestamp based on status
      if (status === 'shipped') {
        updateFields.push(`"shippedAt" = $${paramIndex++}`);
        params.push(new Date());
      } else if (status === 'delivered') {
        updateFields.push(`"deliveredAt" = $${paramIndex++}`);
        params.push(new Date());
      } else if (status === 'cancelled') {
        updateFields.push(`"cancelledAt" = $${paramIndex++}`);
        params.push(new Date());
      }
    }

    // Update fulfillment status if provided
    if (options?.fulfillmentStatus) {
      updateFields.push(`"fulfillmentStatus" = $${paramIndex++}`);
      params.push(options.fulfillmentStatus);
    }

    // Update tracking info if provided
    if (options?.trackingNumber) {
      updateFields.push(`"trackingNumber" = $${paramIndex++}`);
      params.push(options.trackingNumber);
    }

    if (options?.trackingUrl) {
      updateFields.push(`"trackingUrl" = $${paramIndex++}`);
      params.push(options.trackingUrl);
    }

    // Update order
    await client.query(`
      UPDATE orders
      SET ${updateFields.join(', ')}
      WHERE id = $1
    `, params);

    // Insert status history
    const notifiedCustomer = options?.sendEmail !== false;
    await client.query(`
      INSERT INTO "orderStatusHistory" (
        id, "orderId", status, note, "notifiedCustomer", "createdByUserId"
      )
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5)
    `, [orderId, status, options?.note || null, notifiedCustomer, options?.updatedByUserId || null]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Address Management Functions
export async function getUserAddresses(userId: string): Promise<Address[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM "userAddresses"
      WHERE "userId" = $1
      ORDER BY "isDefault" DESC, "createdAt" DESC
    `, [userId]);

    return result.rows;
  } finally {
    client.release();
  }
}

export async function createAddress(userId: string, addressData: Partial<Address>): Promise<Address> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      INSERT INTO "userAddresses" (
        id, "userId", "addressType", "isDefault", "firstName", "lastName",
        company, "addressLine1", "addressLine2", city, "stateProvince",
        "postalCode", country, phone
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING *
    `, [
      userId, addressData.addressType, addressData.isDefault || false,
      addressData.firstName, addressData.lastName, addressData.company,
      addressData.addressLine1, addressData.addressLine2, addressData.city,
      addressData.stateProvince, addressData.postalCode, addressData.country || 'DE',
      addressData.phone
    ]);

    return result.rows[0];
  } finally {
    client.release();
  }
}

// Form Request Management Interfaces
export interface FormRequest {
  id: string;
  formType: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  assignedToUserId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface FormRequestResponse {
  id: string;
  formRequestId: string;
  responseType: string;
  subject?: string;
  message: string;
  templateName?: string;
  sentVia?: string;
  sentToEmail?: string;
  sentAt?: Date;
  emailStatus?: string;
  createdByUserId?: string;
  isInternalNote: boolean;
  createdAt: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  description?: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  category?: string;
  availableVariables?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormRequestFilters {
  status?: string;
  formType?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface FormRequestStats {
  totalRequests: number;
  pendingCount: number;
  inProgressCount: number;
  resolvedCount: number;
  recentRequests: number; // last 7 days
  avgResponseTimeHours?: number;
}

// Form Request Management Functions

/**
 * Create a new form request from a submission
 */
export async function createFormRequest(data: {
  formType: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<string> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO form_requests (
        form_type, name, email, phone, subject, message,
        user_id, ip_address, user_agent, status, priority
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 'normal')
      RETURNING id`,
      [
        data.formType,
        data.name,
        data.email,
        data.phone || null,
        data.subject,
        data.message,
        data.userId || null,
        data.ipAddress || null,
        data.userAgent || null,
      ]
    );

    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * Get all form requests with optional filtering
 */
export async function getAllFormRequests(
  filters?: FormRequestFilters
): Promise<{ requests: FormRequest[]; totalCount: number }> {
  const client = await pool.connect();
  try {
    // Build WHERE clause based on filters
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    if (filters?.formType) {
      conditions.push(`form_type = $${paramCount}`);
      params.push(filters.formType);
      paramCount++;
    }

    if (filters?.assignedTo) {
      conditions.push(`assigned_to_user_id = $${paramCount}`);
      params.push(filters.assignedTo);
      paramCount++;
    }

    if (filters?.dateFrom) {
      conditions.push(`created_at >= $${paramCount}`);
      params.push(filters.dateFrom);
      paramCount++;
    }

    if (filters?.dateTo) {
      conditions.push(`created_at <= $${paramCount}`);
      params.push(filters.dateTo);
      paramCount++;
    }

    if (filters?.search) {
      conditions.push(`(
        name ILIKE $${paramCount} OR
        email ILIKE $${paramCount} OR
        message ILIKE $${paramCount}
      )`);
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM form_requests ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Get paginated results
    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const result = await client.query(
      `SELECT * FROM form_requests
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const requests: FormRequest[] = result.rows.map((row) => ({
      id: row.id,
      formType: row.form_type,
      name: row.name,
      email: row.email,
      phone: row.phone,
      subject: row.subject,
      message: row.message,
      status: row.status,
      priority: row.priority,
      assignedToUserId: row.assigned_to_user_id,
      userId: row.user_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    }));

    return { requests, totalCount };
  } finally {
    client.release();
  }
}

/**
 * Get a single form request by ID with response history
 */
export async function getFormRequestById(requestId: string): Promise<{
  request: FormRequest;
  responses: FormRequestResponse[];
  assignedUser?: { id: string; name: string; email: string };
} | null> {
  const client = await pool.connect();
  try {
    // Get the request
    const requestResult = await client.query(
      `SELECT fr.*, u.name as assigned_user_name, u.email as assigned_user_email
       FROM form_requests fr
       LEFT JOIN "user" u ON fr.assigned_to_user_id = u.id
       WHERE fr.id = $1`,
      [requestId]
    );

    if (requestResult.rows.length === 0) return null;

    const row = requestResult.rows[0];
    const request: FormRequest = {
      id: row.id,
      formType: row.form_type,
      name: row.name,
      email: row.email,
      phone: row.phone,
      subject: row.subject,
      message: row.message,
      status: row.status,
      priority: row.priority,
      assignedToUserId: row.assigned_to_user_id,
      userId: row.user_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    };

    // Get responses
    const responsesResult = await client.query(
      `SELECT * FROM form_request_responses
       WHERE form_request_id = $1
       ORDER BY created_at ASC`,
      [requestId]
    );

    const responses: FormRequestResponse[] = responsesResult.rows.map((r) => ({
      id: r.id,
      formRequestId: r.form_request_id,
      responseType: r.response_type,
      subject: r.subject,
      message: r.message,
      templateName: r.template_name,
      sentVia: r.sent_via,
      sentToEmail: r.sent_to_email,
      sentAt: r.sent_at ? new Date(r.sent_at) : undefined,
      emailStatus: r.email_status,
      createdByUserId: r.created_by_user_id,
      isInternalNote: r.is_internal_note,
      createdAt: new Date(r.created_at),
    }));

    const assignedUser = row.assigned_to_user_id
      ? {
          id: row.assigned_to_user_id,
          name: row.assigned_user_name,
          email: row.assigned_user_email,
        }
      : undefined;

    return { request, responses, assignedUser };
  } finally {
    client.release();
  }
}

/**
 * Update form request status and related fields
 */
export async function updateFormRequestStatus(
  requestId: string,
  status: string,
  options?: {
    assignedTo?: string;
    priority?: string;
    note?: string;
    updatedByUserId?: string;
  }
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Build update query dynamically based on provided options
    const updates: string[] = ['status = $2'];
    const params: any[] = [requestId, status];
    let paramCount = 3;

    if (status === 'resolved' || status === 'closed') {
      updates.push(`resolved_at = CURRENT_TIMESTAMP`);
    }

    if (options?.assignedTo !== undefined) {
      updates.push(`assigned_to_user_id = $${paramCount}`);
      params.push(options.assignedTo);
      paramCount++;

      if (options.assignedTo) {
        updates.push(`assigned_at = CURRENT_TIMESTAMP`);
      }
    }

    if (options?.priority) {
      updates.push(`priority = $${paramCount}`);
      params.push(options.priority);
      paramCount++;
    }

    // Update the request
    await client.query(
      `UPDATE form_requests
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      params
    );

    // If note provided, create an internal response
    if (options?.note) {
      await client.query(
        `INSERT INTO form_request_responses (
          form_request_id, response_type, message,
          is_internal_note, created_by_user_id
        ) VALUES ($1, 'note', $2, true, $3)`,
        [requestId, options.note, options.updatedByUserId || null]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create a response to a form request
 */
export async function createFormRequestResponse(data: {
  formRequestId: string;
  responseType: string;
  subject?: string;
  message: string;
  templateName?: string;
  sentToEmail?: string;
  isInternalNote: boolean;
  createdByUserId?: string;
}): Promise<FormRequestResponse> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO form_request_responses (
        form_request_id, response_type, subject, message,
        template_name, sent_to_email, sent_at, sent_via,
        is_internal_note, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        data.formRequestId,
        data.responseType,
        data.subject || null,
        data.message,
        data.templateName || null,
        data.sentToEmail || null,
        data.isInternalNote ? null : new Date(),
        data.isInternalNote ? null : 'resend',
        data.isInternalNote,
        data.createdByUserId || null,
      ]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      formRequestId: row.form_request_id,
      responseType: row.response_type,
      subject: row.subject,
      message: row.message,
      templateName: row.template_name,
      sentVia: row.sent_via,
      sentToEmail: row.sent_to_email,
      sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
      emailStatus: row.email_status,
      createdByUserId: row.created_by_user_id,
      isInternalNote: row.is_internal_note,
      createdAt: new Date(row.created_at),
    };
  } finally {
    client.release();
  }
}

/**
 * Get email templates
 */
export async function getEmailTemplates(filters?: {
  category?: string;
  isActive?: boolean;
}): Promise<EmailTemplate[]> {
  const client = await pool.connect();
  try {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (filters?.category) {
      conditions.push(`category = $${paramCount}`);
      params.push(filters.category);
      paramCount++;
    }

    if (filters?.isActive !== undefined) {
      conditions.push(`is_active = $${paramCount}`);
      params.push(filters.isActive);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await client.query(
      `SELECT * FROM form_request_email_templates ${whereClause} ORDER BY name`,
      params
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      subject: row.subject,
      htmlBody: row.html_body,
      textBody: row.text_body,
      category: row.category,
      availableVariables: row.available_variables,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  } finally {
    client.release();
  }
}

/**
 * Get form request statistics
 */
export async function getFormRequestStats(): Promise<FormRequestStats> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_requests
      FROM form_requests
    `);

    const row = result.rows[0];
    return {
      totalRequests: parseInt(row.total_requests),
      pendingCount: parseInt(row.pending_count),
      inProgressCount: parseInt(row.in_progress_count),
      resolvedCount: parseInt(row.resolved_count),
      recentRequests: parseInt(row.recent_requests),
    };
  } finally {
    client.release();
  }
}

export { pool };
