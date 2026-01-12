import { useEffect, useState } from 'react';
import type { PriceTier, Product } from '@/types/database';
import { formatPriceTiersForDisplay, formatPrice, getSavingsText } from '@/lib/utils/pricing';

interface PriceTierTableProps {
  product: Product;
  priceTiers: PriceTier[];
  currentQuantity: number;
  currency?: string;
  locale?: string;
}

export default function PriceTierTable({
  product,
  priceTiers,
  currentQuantity,
  currency = 'EUR',
  locale = 'de-DE',
}: PriceTierTableProps) {
  const [displayTiers, setDisplayTiers] = useState(
    formatPriceTiersForDisplay(priceTiers, currentQuantity)
  );

  useEffect(() => {
    setDisplayTiers(formatPriceTiersForDisplay(priceTiers, currentQuantity));
  }, [priceTiers, currentQuantity]);

  if (!priceTiers || priceTiers.length === 0) {
    return null;
  }

  return (
    <div className="price-tier-section">
      <h3 className="text-lg font-semibold mb-2">
        {locale === 'de-DE' ? 'Mehr kaufen, mehr sparen' : 'Buy more, save more'}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        {locale === 'de-DE'
          ? 'Mengenrabatte pro Datei sind mit Wiederverkäuferrabatten kombinierbar'
          : 'Quantity discounts per file can be combined with reseller discounts'}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-4 font-medium">
                {locale === 'de-DE' ? 'Anzahl' : 'Quantity'}
              </th>
              <th className="text-left py-2 px-4 font-medium">
                {locale === 'de-DE' ? 'Mengenrabatt' : 'Discount'}
              </th>
              <th className="text-left py-2 px-4 font-medium">
                {locale === 'de-DE' ? 'Preis' : 'Price'}
              </th>
            </tr>
          </thead>
          <tbody>
            {displayTiers.map((tier) => (
              <tr
                key={tier.id}
                className={`
                  border-b border-gray-100 transition-colors
                  ${tier.isCurrent ? 'bg-blue-50 border-blue-200' : ''}
                  ${tier.isUnlocked && !tier.isCurrent ? 'hover:bg-gray-50' : ''}
                  ${!tier.isUnlocked ? 'opacity-50' : ''}
                `}
              >
                <td className="py-2 px-4">
                  <span className="font-medium">{tier.quantityRange}</span>
                  {tier.isCurrent && (
                    <span className="ml-2 text-xs text-blue-600">
                      {locale === 'de-DE' ? 'Aktuell' : 'Current'}
                    </span>
                  )}
                </td>
                <td className="py-2 px-4">
                  {tier.discountPercent > 0 ? (
                    <span className="text-green-600 font-medium">
                      {tier.discountPercent}%
                    </span>
                  ) : (
                    <span className="text-gray-400">0%</span>
                  )}
                </td>
                <td className="py-2 px-4">
                  <div className="flex items-center gap-2">
                    <span className={tier.isCurrent ? 'font-bold text-blue-600' : 'font-medium'}>
                      {formatPrice(tier.pricePerUnit, currency, locale)}
                    </span>
                    {tier.isUnlocked && tier.discountPercent > 0 && (
                      <span className="text-xs text-green-600">
                        {getSavingsText(tier.discountPercent, locale)}
                      </span>
                    )}
                    {!tier.isUnlocked && (
                      <span className="text-xs text-gray-400">
                        {locale === 'de-DE' ? 'Gesperrt' : 'Locked'}
                      </span>
                    )}
                    {tier.isUnlocked && tier.isCurrent && (
                      <span className="text-xs text-blue-600 font-semibold">
                        {locale === 'de-DE' ? 'Freigeschaltet!' : 'Unlocked!'}
                      </span>
                    )}
                  </div>
                  {tier.isCurrent && tier.minQuantity === 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formatPrice(product.basePrice, currency, locale)}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show info about reaching next tier */}
      {displayTiers.some((tier) => !tier.isUnlocked) && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            {locale === 'de-DE'
              ? `Erhöhen Sie die Menge, um weitere Rabatte freizuschalten!`
              : `Increase quantity to unlock more discounts!`}
          </p>
        </div>
      )}
    </div>
  );
}
