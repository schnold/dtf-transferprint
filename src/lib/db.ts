import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE,
  ssl: {
    rejectUnauthorized: false,
  },
});

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
        "lastLoginAt"
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
    }));
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
        pi.url as "productImage"
      FROM "cartItems" ci
      JOIN products p ON ci."productId" = p.id
      LEFT JOIN LATERAL (
        SELECT url FROM "productImages"
        WHERE "productId" = p.id AND "isPrimary" = true
        LIMIT 1
      ) pi ON true
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
  discountCode?: string
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

    let subtotal = 0;
    for (const item of cartResult.rows) {
      subtotal += parseFloat(item.unitPrice) * item.quantity;
    }

    let discountAmount = 0;
    let discountId = null;
    let shippingCost = 5.99;

    if (discountCode) {
      const cartItems = await getCart(userId);
      const validation = await validateDiscount(discountCode, userId, cartItems);
      if (validation.valid && validation.discount) {
        const discount = validation.discount;
        discountId = discount.id;

        if (discount.discountType === 'free_shipping') {
          shippingCost = 0;
        } else {
          discountAmount = await calculateDiscount(discount, subtotal);
        }
      }
    }

    const taxRate = 0.19;
    const taxAmount = (subtotal - discountAmount + shippingCost) * taxRate;
    const total = subtotal - discountAmount + shippingCost + taxAmount;

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const orderResult = await client.query(`
      INSERT INTO orders (
        id, "orderNumber", "userId", subtotal, "discountAmount",
        "shippingCost", "taxAmount", total, "discountCode", "discountId",
        "shippingAddressId", "billingAddressId"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING *
    `, [
      orderNumber, userId, subtotal, discountAmount,
      shippingCost, taxAmount, total, discountCode, discountId,
      shippingAddressId, billingAddressId
    ]);

    const order = orderResult.rows[0];

    for (const item of cartResult.rows) {
      const productResult = await client.query(
        'SELECT name, sku FROM products WHERE id = $1',
        [item.productId]
      );

      await client.query(`
        INSERT INTO "orderItems" (
          id, "orderId", "productId", "productName", sku,
          quantity, "unitPrice", "totalPrice", "customOptions"
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8
        )
      `, [
        order.id, item.productId, productResult.rows[0].name,
        productResult.rows[0].sku, item.quantity,
        item.unitPrice, parseFloat(item.unitPrice) * item.quantity,
        item.customOptions
      ]);

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

export { pool };
