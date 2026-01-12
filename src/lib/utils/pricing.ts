import type { PriceTier, PriceCalculation, PriceTierDisplay, Product } from '@/types/database';

/**
 * Find the applicable price tier for a given quantity
 */
export function getApplicablePriceTier(
  priceTiers: PriceTier[],
  quantity: number
): PriceTier | undefined {
  if (!priceTiers || priceTiers.length === 0) {
    return undefined;
  }

  // Sort tiers by minQuantity descending to find the highest applicable tier
  const sortedTiers = [...priceTiers].sort((a, b) => b.minQuantity - a.minQuantity);

  return sortedTiers.find(
    (tier) =>
      quantity >= tier.minQuantity &&
      (tier.maxQuantity === null || tier.maxQuantity === undefined || quantity <= tier.maxQuantity)
  );
}

/**
 * Calculate the price for a product with quantity-based tiers and optional reseller discount
 */
export function calculatePrice(
  product: Product,
  quantity: number,
  priceTiers: PriceTier[] = [],
  resellerDiscountPercent: number = 0
): PriceCalculation {
  // Find applicable tier
  const applicableTier = getApplicablePriceTier(priceTiers, quantity);

  // Use tier price if available, otherwise use base price
  const unitPrice = applicableTier ? applicableTier.pricePerUnit : product.basePrice;
  const discountPercent = applicableTier ? applicableTier.discountPercent : 0;

  // Calculate subtotal before any discounts
  const subtotal = unitPrice * quantity;

  // Calculate tier discount (already reflected in the unit price from tier)
  const tierDiscount = applicableTier
    ? (product.basePrice - applicableTier.pricePerUnit) * quantity
    : 0;

  // Calculate reseller discount on top of tier pricing
  const resellerDiscount = (subtotal * resellerDiscountPercent) / 100;

  // Total discount
  const totalDiscount = tierDiscount + resellerDiscount;

  // Final total
  const total = subtotal - resellerDiscount;

  return {
    unitPrice,
    quantity,
    discountPercent,
    resellerDiscountPercent,
    subtotal,
    tierDiscount,
    resellerDiscount,
    totalDiscount,
    total,
    applicableTier,
  };
}

/**
 * Format price tiers for display in a table with quantity ranges
 */
export function formatPriceTiersForDisplay(
  priceTiers: PriceTier[],
  currentQuantity: number = 0
): PriceTierDisplay[] {
  if (!priceTiers || priceTiers.length === 0) {
    return [];
  }

  // Sort by display order or min quantity
  const sortedTiers = [...priceTiers].sort((a, b) => a.displayOrder - b.displayOrder);

  return sortedTiers.map((tier) => {
    // Format quantity range
    const maxQty = tier.maxQuantity === null || tier.maxQuantity === undefined ? '∞' : tier.maxQuantity;
    const quantityRange = `${tier.minQuantity} - ${maxQty}`;

    // Check if this tier is current for the selected quantity
    const isCurrent =
      currentQuantity >= tier.minQuantity &&
      (tier.maxQuantity === null || tier.maxQuantity === undefined || currentQuantity <= tier.maxQuantity);

    // Check if tier is unlocked (user has reached minimum quantity)
    const isUnlocked = currentQuantity >= tier.minQuantity;

    return {
      ...tier,
      quantityRange,
      isCurrent,
      isUnlocked,
    };
  });
}

/**
 * Format price for display (e.g., "14.99 €" or "€14.99")
 */
export function formatPrice(price: number, currency: string = 'EUR', locale: string = 'de-DE'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(price);
}

/**
 * Calculate total area in square meters
 */
export function calculateArea(widthMm: number, heightMm: number): number {
  return (widthMm * heightMm) / 1_000_000; // Convert mm² to m²
}

/**
 * Calculate price per area (e.g., per square meter)
 */
export function calculatePricePerArea(
  product: Product,
  widthMm: number,
  heightMm: number,
  quantity: number,
  priceTiers: PriceTier[] = []
): PriceCalculation {
  const area = calculateArea(widthMm, heightMm);
  const totalArea = area * quantity;

  // For area-based pricing, we might want to use the area as the "quantity" for tier calculation
  const priceCalc = calculatePrice(product, quantity, priceTiers);

  // Adjust total based on area if needed
  if (product.priceCalculationMethod === 'per_area') {
    const totalByArea = priceCalc.unitPrice * totalArea;
    return {
      ...priceCalc,
      subtotal: totalByArea,
      total: totalByArea - priceCalc.resellerDiscount,
    };
  }

  return priceCalc;
}

/**
 * Calculate price per meter (linear meter)
 */
export function calculatePricePerMeter(
  product: Product,
  heightMm: number,
  quantity: number,
  priceTiers: PriceTier[] = []
): PriceCalculation {
  const meters = heightMm / 1000;
  const totalMeters = meters * quantity;

  const priceCalc = calculatePrice(product, quantity, priceTiers);

  // Adjust total based on meters if needed
  if (product.priceCalculationMethod === 'per_meter') {
    const totalByMeter = priceCalc.unitPrice * totalMeters;
    return {
      ...priceCalc,
      subtotal: totalByMeter,
      total: totalByMeter - priceCalc.resellerDiscount,
    };
  }

  return priceCalc;
}

/**
 * Get savings text for display (e.g., "Save 13%")
 */
export function getSavingsText(discountPercent: number, locale: string = 'de-DE'): string {
  if (discountPercent <= 0) return '';

  const percent = new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(discountPercent / 100);

  return locale === 'de-DE' ? `Spare ${percent}` : `Save ${percent}`;
}

/**
 * Check if product configuration is valid
 */
export function isValidProductConfiguration(
  product: Product,
  widthMm?: number,
  heightMm?: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (product.acceptsFileUpload) {
    if (widthMm && product.maxWidthMm && widthMm > product.maxWidthMm) {
      errors.push(`Width cannot exceed ${product.maxWidthMm}mm`);
    }

    if (heightMm && product.minHeightMm && heightMm < product.minHeightMm) {
      errors.push(`Height must be at least ${product.minHeightMm}mm`);
    }

    if (heightMm && product.maxHeightMm && heightMm > product.maxHeightMm) {
      errors.push(`Height cannot exceed ${product.maxHeightMm}mm`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate quantity needed to reach next tier
 */
export function getQuantityForNextTier(priceTiers: PriceTier[], currentQuantity: number): number | null {
  if (!priceTiers || priceTiers.length === 0) {
    return null;
  }

  // Sort tiers by minQuantity ascending
  const sortedTiers = [...priceTiers].sort((a, b) => a.minQuantity - b.minQuantity);

  // Find the next tier
  const nextTier = sortedTiers.find((tier) => tier.minQuantity > currentQuantity);

  return nextTier ? nextTier.minQuantity - currentQuantity : null;
}
