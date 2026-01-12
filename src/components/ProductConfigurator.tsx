import { useState, useEffect } from 'react';
import type { Product, PriceTier } from '@/types/database';
import { calculatePrice, formatPrice, isValidProductConfiguration } from '@/lib/utils/pricing';
import PriceTierTable from './PriceTierTable';

interface ProductConfiguratorProps {
  product: Product;
  priceTiers: PriceTier[];
  isReseller?: boolean;
  resellerDiscountPercent?: number;
  currency?: string;
  locale?: string;
}

export default function ProductConfigurator({
  product,
  priceTiers,
  isReseller = false,
  resellerDiscountPercent = 0,
  currency = 'EUR',
  locale = 'de-DE',
}: ProductConfiguratorProps) {
  const [widthMm, setWidthMm] = useState(product.maxWidthMm || 560);
  const [heightMm, setHeightMm] = useState(product.minHeightMm || 1000);
  const [quantity, setQuantity] = useState(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Calculate price whenever configuration changes
  const priceCalculation = calculatePrice(
    product,
    quantity,
    priceTiers,
    isReseller ? resellerDiscountPercent : 0
  );

  // Validate configuration whenever it changes
  useEffect(() => {
    if (product.acceptsFileUpload) {
      const validation = isValidProductConfiguration(product, widthMm, heightMm);
      setErrors(validation.errors);
    }
  }, [product, widthMm, heightMm]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = product.allowedFileTypes?.split(',').map((t) => t.trim()) || ['PDF'];
    const fileExtension = file.name.split('.').pop()?.toUpperCase();

    if (!allowedTypes.includes(fileExtension || '')) {
      setErrors([`Only ${allowedTypes.join(', ')} files are allowed`]);
      return;
    }

    // Validate file size
    const maxSizeMB = product.maxFileSizeMb || 255;
    const fileSizeMB = file.size / 1024 / 1024;

    if (fileSizeMB > maxSizeMB) {
      setErrors([`File size cannot exceed ${maxSizeMB}MB`]);
      return;
    }

    setUploadedFile(file);
    setIsUploading(true);

    try {
      // Upload file to server (implement your upload logic here)
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const data = await response.json();
      setUploadedFileUrl(data.url);
      setErrors([]);
    } catch (error) {
      console.error('Upload error:', error);
      setErrors(['File upload failed. Please try again.']);
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddToCart = async () => {
    if (errors.length > 0) {
      return;
    }

    if (product.acceptsFileUpload && !uploadedFileUrl) {
      setErrors(['Please upload a file before adding to cart']);
      return;
    }

    setIsAddingToCart(true);

    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          widthMm: product.acceptsFileUpload ? widthMm : undefined,
          heightMm: product.acceptsFileUpload ? heightMm : undefined,
          uploadedFileUrl: uploadedFileUrl || undefined,
          uploadedFileName: uploadedFile?.name || undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setErrors([data.error.message]);
        return;
      }

      // Show success message (you can use a toast notification here)
      alert('Product added to cart!');

      // Reset form
      setUploadedFile(null);
      setUploadedFileUrl(null);
    } catch (error) {
      console.error('Add to cart error:', error);
      setErrors(['Failed to add to cart. Please try again.']);
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="product-configurator space-y-6">
      {/* File Upload Section */}
      {product.acceptsFileUpload && (
        <div className="file-upload-section border rounded-lg p-4">
          <label className="block text-sm font-medium mb-2">
            {locale === 'de-DE' ? 'Datei hochladen' : 'Upload File'}
          </label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              onChange={handleFileUpload}
              accept={product.allowedFileTypes?.split(',').map((t) => `.${t.trim().toLowerCase()}`).join(',')}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              disabled={isUploading}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {locale === 'de-DE' ? 'Akzeptiert' : 'Accepts'}: {product.allowedFileTypes} (
            {locale === 'de-DE' ? 'Max.' : 'Max'}: {product.maxFileSizeMb}MB)
          </p>
          {uploadedFile && (
            <p className="text-sm text-green-600 mt-2">
              ✓ {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)}MB)
            </p>
          )}
        </div>
      )}

      {/* Dimensions Configuration */}
      {product.acceptsFileUpload && (
        <div className="dimensions-section grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              {locale === 'de-DE' ? 'Breite (mm)' : 'Width (mm)'}
            </label>
            <input
              type="number"
              value={widthMm}
              onChange={(e) => setWidthMm(Number(e.target.value))}
              min={1}
              max={product.maxWidthMm || undefined}
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              {locale === 'de-DE' ? 'Max.' : 'Max'}: {product.maxWidthMm}mm
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              {locale === 'de-DE' ? 'Höhe (mm)' : 'Height (mm)'}
            </label>
            <input
              type="number"
              value={heightMm}
              onChange={(e) => setHeightMm(Number(e.target.value))}
              min={product.minHeightMm || 1}
              max={product.maxHeightMm || undefined}
              className="w-full px-3 py-2 border rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              {product.minHeightMm} - {product.maxHeightMm}mm
            </p>
          </div>
        </div>
      )}

      {/* Quantity Selector */}
      <div className="quantity-section">
        <label className="block text-sm font-medium mb-2">
          {locale === 'de-DE' ? 'Anzahl' : 'Quantity'}
        </label>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          min={1}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>

      {/* Price Display */}
      <div className="price-display bg-gray-50 border rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">
            {locale === 'de-DE' ? 'Einzelpreis' : 'Unit Price'}
          </span>
          <span className="text-lg font-medium">
            {formatPrice(priceCalculation.unitPrice, currency, locale)}
          </span>
        </div>

        {priceCalculation.tierDiscount > 0 && (
          <div className="flex justify-between items-center mb-2 text-green-600">
            <span className="text-sm">
              {locale === 'de-DE' ? 'Mengenrabatt' : 'Quantity Discount'} (
              {priceCalculation.discountPercent}%)
            </span>
            <span className="text-sm">
              -{formatPrice(priceCalculation.tierDiscount, currency, locale)}
            </span>
          </div>
        )}

        {isReseller && resellerDiscountPercent > 0 && (
          <div className="flex justify-between items-center mb-2 text-blue-600">
            <span className="text-sm">
              {locale === 'de-DE' ? 'Wiederverkäuferrabatt' : 'Reseller Discount'} (
              {resellerDiscountPercent}%)
            </span>
            <span className="text-sm">
              -{formatPrice(priceCalculation.resellerDiscount, currency, locale)}
            </span>
          </div>
        )}

        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">
              {locale === 'de-DE' ? 'Gesamtpreis' : 'Total Price'}
            </span>
            <span className="text-2xl font-bold text-blue-600">
              {formatPrice(priceCalculation.total, currency, locale)}
            </span>
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600">
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        disabled={errors.length > 0 || isAddingToCart || isUploading}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-md font-semibold
          hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
          transition-colors"
      >
        {isAddingToCart
          ? locale === 'de-DE'
            ? 'Wird hinzugefügt...'
            : 'Adding...'
          : locale === 'de-DE'
          ? 'In den Warenkorb'
          : 'Add to Cart'}
      </button>

      {/* Price Tier Table */}
      <PriceTierTable
        product={product}
        priceTiers={priceTiers}
        currentQuantity={quantity}
        currency={currency}
        locale={locale}
      />
    </div>
  );
}
