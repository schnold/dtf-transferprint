// ============================================
// Database Types for DTF Transfer Print
// Matches the existing database schema with camelCase naming
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
  isReseller?: boolean;
  resellerDiscountPercent?: number;
  gewerbebetreiber: boolean;
  umsatzsteuernummer?: string;
}

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

export interface CategoryTree extends Category {
  fullPath: string;
  level: number;
  children?: CategoryTree[];
}

export interface Product {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;

  // Base pricing
  basePrice: number;
  compareAtPrice?: number;
  costPerItem?: number;

  // Product identifiers
  sku?: string;
  barcode?: string;

  // Inventory
  trackInventory: boolean;
  inventoryQuantity: number;
  inventoryPolicy: 'deny' | 'continue';
  lowStockThreshold?: number;

  // Shipping
  weight?: number;
  weightUnit?: 'g' | 'kg' | 'lb' | 'oz';
  requiresShipping: boolean;

  // Status
  isActive: boolean;
  isFeatured: boolean;

  // DTF-specific fields
  maxWidthMm?: number;
  minHeightMm?: number;
  maxHeightMm?: number;
  acceptsFileUpload?: boolean;
  maxFileSizeMb?: number;
  allowedFileTypes?: string;
  priceCalculationMethod?: 'per_piece' | 'per_area' | 'per_meter';
  isBlockout?: boolean;
  printTechnology?: string;
  requiresInquiry?: boolean;

  // SEO
  searchKeywords?: string;
  metaTitle?: string;
  metaDescription?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithDetails extends Product {
  categoryName?: string;
  categorySlug?: string;
  categoryPath?: string;
  images?: ProductImage[];
  priceTiers?: PriceTier[];
  relatedProducts?: Product[];
  specifications?: ProductSpecification[];
  tags?: ProductTag[];
  reviews?: ProductReview[];
  averageRating?: number;
  reviewCount?: number;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: Date;
}

export interface ProductSpecification {
  id: string;
  productId: string;
  specKey: string;
  specLabel: string;
  specValue: string;
  displayOrder: number;
  createdAt: Date;
}

export interface ProductTag {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export interface PriceTier {
  id: string;
  productId: string;
  minQuantity: number;
  maxQuantity?: number; // null means infinity
  discountPercent: number;
  pricePerUnit: number;
  displayOrder: number;
  createdAt: Date;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  rating: number; // 1-5
  title?: string;
  comment: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RelatedProduct {
  id: string;
  productId: string;
  relatedProductId: string;
  displayOrder: number;
  createdAt: Date;
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  unitPrice: number;

  // DTF-specific customization
  customOptions?: Record<string, any>;
  widthMm?: number;
  heightMm?: number;
  uploadedFileUrl?: string;
  uploadedFileName?: string;

  createdAt: Date;
  updatedAt: Date;

  // Joined data
  product?: Product;
  lineTotal?: number;
  appliedTier?: PriceTier;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;

  // Status
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  fulfillmentStatus: 'unfulfilled' | 'partial' | 'fulfilled';

  // Pricing
  currency: string;
  subtotal: number;
  discountAmount: number;
  shippingCost: number;
  taxAmount: number;
  total: number;

  // Discount info
  discountCode?: string;
  discountId?: string;

  // Shipping info
  shippingMethod?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingAddressId?: string;
  billingAddressId?: string;

  // Notes
  customerNote?: string;
  adminNote?: string;

  // Metadata
  ipAddress?: string;
  userAgent?: string;

  // Timestamps
  cancelledAt?: Date;
  cancelledReason?: string;
  refundedAt?: Date;
  refundedAmount?: number;
  refundedReason?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
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

  // DTF-specific customization
  customOptions?: Record<string, any>;
  widthMm?: number;
  heightMm?: number;
  uploadedFileUrl?: string;
  uploadedFileName?: string;
  discountPercent?: number;

  createdAt: Date;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: string;
  note?: string;
  notifiedCustomer: boolean;
  createdByUserId?: string;
  createdAt: Date;
}

export interface UserAddress {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
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

// ============================================
// Frontend-specific Types
// ============================================

export interface ProductConfiguration {
  widthMm?: number;
  heightMm?: number;
  quantity: number;
  uploadedFile?: File;
  uploadedFileUrl?: string;
  uploadedFileName?: string;
}

export interface PriceCalculation {
  unitPrice: number;
  quantity: number;
  discountPercent: number;
  resellerDiscountPercent: number;
  subtotal: number;
  tierDiscount: number;
  resellerDiscount: number;
  totalDiscount: number;
  total: number;
  applicableTier?: PriceTier;
}

export interface PriceTierDisplay extends PriceTier {
  quantityRange: string; // e.g., "0 - 4" or "150 - ∞"
  isCurrent: boolean; // if this tier applies to current quantity
  isUnlocked: boolean; // if user has reached this tier
}

// ============================================
// Admin Backend Form Types
// ============================================

export interface ProductFormData {
  categoryId: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;

  // Pricing
  basePrice: number;
  compareAtPrice?: number;
  costPerItem?: number;

  // Product identifiers
  sku?: string;
  barcode?: string;

  // Inventory
  trackInventory: boolean;
  inventoryQuantity: number;
  inventoryPolicy: 'deny' | 'continue';
  lowStockThreshold?: number;

  // Shipping
  weight?: number;
  weightUnit?: 'g' | 'kg' | 'lb' | 'oz';
  requiresShipping: boolean;

  // Status
  isActive: boolean;
  isFeatured: boolean;

  // DTF-specific fields
  maxWidthMm?: number;
  minHeightMm?: number;
  maxHeightMm?: number;
  acceptsFileUpload?: boolean;
  maxFileSizeMb?: number;
  allowedFileTypes?: string;
  priceCalculationMethod?: 'per_piece' | 'per_area' | 'per_meter';
  isBlockout?: boolean;
  printTechnology?: string;
  requiresInquiry?: boolean;

  // SEO
  searchKeywords?: string;
  metaTitle?: string;
  metaDescription?: string;

  // Related data
  images?: Array<{
    url: string;
    altText?: string;
    displayOrder: number;
    isPrimary: boolean;
  }>;
  priceTiers?: Array<{
    minQuantity: number;
    maxQuantity?: number;
    discountPercent: number;
    pricePerUnit: number;
    displayOrder: number;
  }>;
  specifications?: Array<{
    specKey: string;
    specLabel: string;
    specValue: string;
    displayOrder: number;
  }>;
  relatedProductIds?: string[];
  tagIds?: string[];
}

export interface CategoryFormData {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  displayOrder: number;
  isActive: boolean;
  imageUrl?: string;
}

export interface DiscountFormData {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping';
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageLimitPerUser?: number;
  appliesTo: 'all' | 'specific_products' | 'specific_categories';
  isActive: boolean;
  startsAt: Date;
  endsAt?: Date;
  productIds?: string[];
  categoryIds?: string[];
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}
