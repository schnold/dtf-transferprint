# File Upload Enhancement - PNG Support & Quality Validation

## Overview
Enhanced the file upload system to support both PDF and PNG files, with automatic quality validation based on print requirements (DPI, resolution) and visual previews.

## New Features

### 1. **Multi-Format Support**
- **PDF Files**: Continue to support PDF uploads for vector designs
- **PNG Files**: New support for PNG image files
- File type validation on both client and server side
- Max file size: 255MB for both formats

### 2. **Print Quality Validation**
Product-specific requirements can now be configured in the database:
- **Required DPI**: Minimum DPI for print quality (default: 300 DPI)
- **Minimum Width**: Minimum pixel width
- **Minimum Height**: Minimum pixel height
- **Allowed File Types**: Comma-separated list (e.g., "pdf,png")

### 3. **Automatic Metadata Extraction**
#### For PNG Files:
- Image dimensions (width × height in pixels)
- DPI (dots per inch) from EXIF data
- File size
- Quality assessment

#### For PDF Files:
- File validation
- File size
- Notice about manual DPI verification

### 4. **Quality Warnings & Notifications**
Visual feedback system shows:
- ✅ **Success** (green): File meets all requirements
- ⚠️ **Warning** (yellow): File usable but below optimal quality
- ❌ **Error** (red): File does not meet minimum requirements

Warning examples:
- "Niedrige DPI: 150 DPI (Empfohlen: 300 DPI für beste Druckqualität)"
- "Bildbreite zu gering: 800px (Mindestens 1200px erforderlich)"
- "✓ Qualität ausgezeichnet: 3000x2000px @ 300 DPI"

### 5. **Visual File Previews**
#### PNG Preview:
- Full image preview shown in product page
- Responsive aspect ratio container
- Direct image display

#### PDF Preview:
- First page rendered using PDF.js
- Canvas-based rendering
- Loading indicator during render

### 6. **File Information Display**
Shows detailed info below preview:
- File name
- File size in MB
- Dimensions (for PNG)
- DPI (if available)
- File type icon (green for PNG, red for PDF)

## Database Schema

### New Columns in `products` Table:
```sql
"requiredDpi" integer DEFAULT 300
"requiredMinWidth" integer
"requiredMinHeight" integer
"allowedFileTypes" text DEFAULT 'pdf,png'
```

### New Columns in `cartItems` Table:
```sql
"fileMetadata" jsonb
```

### New Columns in `orderItems` Table:
```sql
"fileMetadata" jsonb
```

### File Metadata Structure:
```json
{
  "fileType": "png" | "pdf",
  "width": 3000,
  "height": 2000,
  "dpi": 300,
  "fileSize": 1024000,
  "meetsRequirements": true,
  "warnings": [
    "✓ Qualität ausgezeichnet: 3000x2000px @ 300 DPI"
  ]
}
```

## Implementation Details

### New Files Created:
1. **`src/lib/file-metadata.ts`**
   - Metadata extraction utilities
   - Validation logic
   - Quality assessment functions

2. **`better-auth_migrations/2026-01-13T12-00-00.000Z_add_file_requirements.sql`**
   - Database schema for quality requirements
   - Metadata storage columns

### Modified Files:
1. **`src/pages/api/upload/design-file.ts`**
   - Added PNG support
   - Integrated metadata extraction
   - Product requirements lookup

2. **`src/pages/product/[slug].astro`**
   - Updated UI for dual format support
   - Added quality warnings section
   - Implemented visual previews
   - PDF.js integration for PDF preview

3. **`src/pages/api/cart/add.ts`**
   - Store file metadata with cart items

4. **`src/lib/db.ts`**
   - Updated interfaces
   - Transfer metadata to orders

5. **`src/components/product/ProductActions.astro`**
   - Send metadata with cart requests

## User Experience Flow

### Uploading a PNG File:
1. User selects PNG file
2. File uploads to R2 immediately
3. Server extracts metadata (dimensions, DPI)
4. Server validates against product requirements
5. Preview shows actual image
6. Quality warnings displayed (if any)
7. File info shows: "2.5 MB • 3000x2000px • 300 DPI"

### Uploading a PDF File:
1. User selects PDF file
2. File uploads to R2 immediately
3. Server validates PDF structure
4. Preview renders first page
5. Warning shown: "PDF-Datei hochgeladen. Bitte stellen Sie sicher, dass Ihre PDF-Datei mindestens 300 DPI hat."
6. File info shows: "5.2 MB"

### Quality Warnings:
- **High Quality PNG** (3000x2000px @ 300 DPI):
  ```
  ✓ Qualität ausgezeichnet: 3000x2000px @ 300 DPI
  ```

- **Low DPI PNG** (1200x800px @ 72 DPI):
  ```
  ⚠️ Niedrige DPI: 72 DPI (Empfohlen: 300 DPI für beste Druckqualität)
  ```

- **Small Image** (500x500px @ 300 DPI):
  ```
  ❌ Bildbreite zu gering: 500px (Mindestens 1200px erforderlich)
  ❌ Bildhöhe zu gering: 500px (Mindestens 800px erforderlich)
  ```

## Configuration

### Setting Product Requirements

Update products table to set custom requirements:
```sql
UPDATE products
SET
  "requiredDpi" = 300,
  "requiredMinWidth" = 1200,
  "requiredMinHeight" = 800,
  "allowedFileTypes" = 'pdf,png'
WHERE id = 'product-id';
```

### Default Requirements (if not set):
- **DPI**: 300
- **Min Width**: None (no restriction)
- **Min Height**: None (no restriction)
- **Allowed Types**: 'pdf,png'

## API Changes

### POST `/api/upload/design-file`

**New Request Parameter:**
- `productId` (optional): Product ID to fetch specific requirements

**Enhanced Response:**
```json
{
  "success": true,
  "data": {
    "fileUrl": "https://...",
    "fileName": "design.png",
    "fileSize": 2560000,
    "fileType": "png",
    "metadata": {
      "fileType": "png",
      "width": 3000,
      "height": 2000,
      "dpi": 300,
      "fileSize": 2560000,
      "meetsRequirements": true,
      "warnings": [
        "✓ Qualität ausgezeichnet: 3000x2000px @ 300 DPI"
      ]
    },
    "message": "Design file uploaded successfully"
  }
}
```

### POST `/api/cart/add`

**New Request Parameter:**
- `fileMetadata`: JSON object containing file quality information

## Dependencies Added

### NPM Packages:
```json
{
  "sharp": "^latest",      // Image processing and metadata extraction
  "pdf-parse": "^latest"   // PDF metadata extraction
}
```

### Client-Side Libraries:
```html
<!-- PDF.js for PDF rendering -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
```

## Testing Checklist

### PNG Files:
- [ ] Upload high-quality PNG (3000x2000px @ 300 DPI) → Should show success
- [ ] Upload low DPI PNG (1200x800px @ 72 DPI) → Should show warning
- [ ] Upload small PNG (400x400px @ 300 DPI) → Should show error if min dimensions set
- [ ] Verify image preview displays correctly
- [ ] Verify metadata shows in file info

### PDF Files:
- [ ] Upload valid PDF → Should show first page preview
- [ ] Upload large PDF (> 50MB) → Should handle appropriately
- [ ] Verify PDF preview renders using PDF.js
- [ ] Verify warning about manual DPI verification

### Quality Validation:
- [ ] Product with no requirements → Should accept any valid file
- [ ] Product with DPI requirement → Should validate DPI
- [ ] Product with dimension requirements → Should validate dimensions
- [ ] Verify warnings display correctly (green/yellow/red)

### Cart & Order Flow:
- [ ] Add product with uploaded file to cart
- [ ] Verify metadata stored in cartItems
- [ ] Complete checkout
- [ ] Verify metadata transferred to orderItems
- [ ] View order history and verify file info preserved

## Future Enhancements

1. **Additional File Formats**:
   - JPEG support
   - TIFF support for professional printing
   - SVG for vector graphics

2. **Advanced Validation**:
   - Color space validation (CMYK vs RGB)
   - Embedded font checking for PDFs
   - Bleed and crop marks detection

3. **File Processing**:
   - Automatic DPI upscaling
   - Format conversion (PNG to PDF, etc.)
   - Compression optimization

4. **Admin Features**:
   - Bulk requirement setting for product categories
   - File quality reports and analytics
   - Automated file quality scoring

5. **User Experience**:
   - Multi-page PDF preview with navigation
   - Zoom controls for previews
   - Side-by-side comparison of multiple uploads
   - File editing/cropping tools

## Notes

- PNG DPI extraction relies on EXIF metadata - files without DPI info will show warning
- PDF DPI cannot be reliably extracted without rendering - requires manual verification
- File metadata persists through cart → order lifecycle for quality tracking
- Requirements are product-specific - different products can have different standards
- Sharp library handles PNG processing efficiently even for large files
- PDF.js loads asynchronously - preview shows loading indicator

## Migration Guide

To add requirements to existing products:

```sql
-- Add standard print requirements to all products
UPDATE products
SET
  "requiredDpi" = 300,
  "allowedFileTypes" = 'pdf,png'
WHERE "acceptsFileUpload" = true;

-- Add dimension requirements for large format products
UPDATE products
SET
  "requiredMinWidth" = 2400,
  "requiredMinHeight" = 1600
WHERE "categoryId" IN (
  SELECT id FROM categories WHERE slug = 'large-format-dtf'
);
```

## Support

For issues or questions:
- Check browser console for detailed error messages
- Verify R2 credentials are configured correctly
- Ensure Sharp library is installed: `npm install sharp`
- Check that PDF.js CDN is accessible
