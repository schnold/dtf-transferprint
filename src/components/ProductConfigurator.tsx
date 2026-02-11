import { useState, useEffect } from 'react';
import type { Product, PriceTier } from '@/types/database';
import { calculatePrice, formatPrice, isValidProductConfiguration } from '@/lib/utils/pricing';
import {
  validateFileBeforeUpload,
  formatFileSize,
  type ClientValidationResult,
  type FileMetadata,
} from '@/lib/utils/client-file-validation';
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
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ClientValidationResult | null>(null);
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null);

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset previous state
    setValidationResult(null);
    setFileMetadata(null);
    setUploadedFile(null);
    setUploadedFileUrl(null);

    // Run client-side validation
    setIsValidating(true);

    try {
      const requirements = {
        allowedFileTypes: product.allowedFileTypes || 'PDF',
        maxFileSizeMb: product.maxFileSizeMb || 255,
        requiredDpi: product.requiredDpi,
        requiredMinWidth: product.requiredMinWidth,
        requiredMinHeight: product.requiredMinHeight,
      };

      const result = await validateFileBeforeUpload(file, requirements);
      setValidationResult(result);
      setFileMetadata(result.metadata || null);

      if (result.valid) {
        setUploadedFile(file);
        setErrors([]);
      } else {
        setErrors(result.errors);
      }
    } catch (error) {
      console.error('Validation error:', error);
      setErrors(['Dateivalidierung fehlgeschlagen']);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadedFile) return;
    if (!validationResult?.valid) {
      setErrors(['Bitte beheben Sie die Validierungsfehler vor dem Hochladen']);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('productId', product.id);

      const response = await fetch('/api/upload/design-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Upload failed');
      }

      setUploadedFileUrl(data.data.fileUrl);
      setErrors([]);
    } catch (error: any) {
      console.error('Upload error:', error);
      setErrors([error.message || 'Datei-Upload fehlgeschlagen. Bitte versuchen Sie es erneut.']);
      setUploadedFile(null);
      setUploadedFileUrl(null);
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
        <div className="file-upload-section border rounded-lg p-4 space-y-3">
          <label className="block text-sm font-medium mb-2">
            {locale === 'de-DE' ? 'Designdatei hochladen' : 'Upload Design File'}
          </label>

          {/* File Input */}
          <div className="flex items-center gap-4">
            <input
              type="file"
              onChange={handleFileSelect}
              accept={product.allowedFileTypes?.split(',').map((t) => `.${t.trim().toLowerCase()}`).join(',')}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
              disabled={isUploading || isValidating}
            />
          </div>

          {/* Requirements */}
          <p className="text-xs text-gray-500">
            {locale === 'de-DE' ? 'Akzeptiert' : 'Accepts'}: {product.allowedFileTypes} (
            {locale === 'de-DE' ? 'Max.' : 'Max'}: {product.maxFileSizeMb}MB)
            {product.requiredMinWidth && product.requiredMinHeight && (
              <span>
                {' '}
                • {locale === 'de-DE' ? 'Min. Abmessungen' : 'Min. dimensions'}:{' '}
                {product.requiredMinWidth}x{product.requiredMinHeight}px
              </span>
            )}
            {product.requiredDpi && (
              <span>
                {' '}
                • {locale === 'de-DE' ? 'Empfohlene DPI' : 'Recommended DPI'}: {product.requiredDpi}
              </span>
            )}
          </p>

          {/* Validating State */}
          {isValidating && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>{locale === 'de-DE' ? 'Datei wird validiert...' : 'Validating file...'}</span>
            </div>
          )}

          {/* Validation Errors */}
          {validationResult && !validationResult.valid && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm font-medium text-red-800 mb-1">
                {locale === 'de-DE' ? 'Validierungsfehler:' : 'Validation Errors:'}
              </p>
              {validationResult.errors.map((error, index) => (
                <p key={index} className="text-sm text-red-600">
                  • {error}
                </p>
              ))}
            </div>
          )}

          {/* File Metadata & Warnings */}
          {validationResult && validationResult.valid && fileMetadata && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-2">
              <p className="text-sm font-medium text-green-800">
                ✓ {locale === 'de-DE' ? 'Datei erfolgreich validiert' : 'File successfully validated'}
              </p>
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <strong>{locale === 'de-DE' ? 'Dateiname' : 'Filename'}:</strong> {uploadedFile?.name}
                </p>
                <p>
                  <strong>{locale === 'de-DE' ? 'Typ' : 'Type'}:</strong> {fileMetadata.fileType}
                </p>
                <p>
                  <strong>{locale === 'de-DE' ? 'Größe' : 'Size'}:</strong>{' '}
                  {formatFileSize(fileMetadata.fileSize)}
                </p>
                {fileMetadata.width && fileMetadata.height && (
                  <p>
                    <strong>{locale === 'de-DE' ? 'Abmessungen' : 'Dimensions'}:</strong>{' '}
                    {fileMetadata.width} x {fileMetadata.height}px
                  </p>
                )}
              </div>
              {validationResult.warnings.length > 0 && (
                <div className="text-sm text-yellow-700 space-y-1 mt-2 pt-2 border-t border-green-300">
                  {validationResult.warnings.map((warning, index) => (
                    <p key={index}>• {warning}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload Button */}
          {uploadedFile && validationResult?.valid && !uploadedFileUrl && (
            <button
              onClick={handleFileUpload}
              disabled={isUploading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-semibold
                hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                transition-colors flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>{locale === 'de-DE' ? 'Wird hochgeladen...' : 'Uploading...'}</span>
                </>
              ) : (
                <span>{locale === 'de-DE' ? 'Datei hochladen' : 'Upload File'}</span>
              )}
            </button>
          )}

          {/* Uploaded Successfully */}
          {uploadedFileUrl && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                ✓ {locale === 'de-DE' ? 'Datei erfolgreich hochgeladen!' : 'File uploaded successfully!'}
              </p>
            </div>
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
