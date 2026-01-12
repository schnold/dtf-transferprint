# PDF Upload Implementation for Product Page

## Overview
This implementation adds PDF design file upload functionality to the product page, with secure storage in Cloudflare R2 and integration with the cart and order systems.

## Features Implemented

### 1. **PDF-Only File Upload**
- Users can upload **only PDF files** (max 255MB)
- File validation on both client and server side
- Clear error messages for invalid file types or sizes

### 2. **Immediate R2 Storage**
- Files are uploaded to R2 storage immediately when selected
- Files are organized by user ID: `design-files/{userId}/{timestamp}-{filename}.pdf`
- Secure storage with unique filenames to prevent collisions
- Files persist in R2 and are associated with cart items and orders

### 3. **PDF Preview on Product Page**
- Visual preview showing:
  - PDF icon
  - File name
  - File size in MB
  - Remove button to clear upload
- Preview persists across page navigations using sessionStorage
- Preview clears automatically when item is added to cart

### 4. **Cart Integration**
- Uploaded file URL and filename are stored with cart items
- Files are stored in both dedicated columns (`uploadedFileUrl`, `uploadedFileName`) and in `customOptions` JSONB
- Cart items maintain file associations until checkout

### 5. **Order Integration**
- When orders are created, file information transfers from cart items to order items
- Order items include `uploadedFileUrl` and `uploadedFileName` columns
- Users can see which files were used for each order

## Database Schema Changes

### New Columns in `cartItems` table (already existed):
```sql
ALTER TABLE "cartItems"
ADD COLUMN IF NOT EXISTS "uploadedFileUrl" text,
ADD COLUMN IF NOT EXISTS "uploadedFileName" text;
```

### New Columns in `orderItems` table (newly added):
```sql
ALTER TABLE "orderItems"
ADD COLUMN IF NOT EXISTS "uploadedFileUrl" text,
ADD COLUMN IF NOT EXISTS "uploadedFileName" text;
```

## API Endpoints

### POST `/api/upload/design-file`
Uploads a PDF file to R2 storage.

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData with `file` field (PDF only)

**Response:**
```json
{
  "success": true,
  "data": {
    "fileUrl": "https://...",
    "fileName": "design.pdf",
    "fileSize": 1024000,
    "message": "Design file uploaded successfully"
  }
}
```

**Error Cases:**
- 401: User not logged in
- 400: Invalid file type (not PDF)
- 400: File size exceeds 255MB
- 500: Upload failed

### POST `/api/cart/add`
Adds product to cart with optional uploaded file information.

**Request:**
```json
{
  "productId": "uuid",
  "quantity": 1,
  "uploadedFileUrl": "https://...",  // Optional
  "uploadedFileName": "design.pdf"   // Optional
}
```

## File Flow

```
1. User selects PDF file on product page
   ↓
2. File is validated (PDF only, max 255MB)
   ↓
3. File uploads to R2 → /design-files/{userId}/{timestamp}-{filename}.pdf
   ↓
4. File URL stored in sessionStorage + preview shown
   ↓
5. User adds product to cart
   ↓
6. File URL/name sent with cart add request
   ↓
7. File info stored in cartItems table
   ↓
8. User completes checkout
   ↓
9. File info transferred from cart to orderItems
   ↓
10. User can view file info in order history
```

## User Experience

### On Product Page:
1. User sees "Design hochladen (PDF erforderlich)" section
2. Clicks file input, selects PDF
3. File uploads automatically
4. Preview appears showing file name and size
5. User can remove file if needed
6. When "In den Warenkorb" clicked, file is associated with cart item
7. Preview clears after successful add to cart

### In Cart:
- Cart items include uploaded file information
- File URLs are stored and persist across sessions

### In Orders:
- Order items include uploaded file URL and filename
- Users can see which design files were used for each order

## Security Features

1. **Authentication Required**: Only logged-in users can upload files
2. **File Type Validation**:
   - MIME type check: `application/pdf`
   - Extension check: `.pdf`
3. **File Size Limit**: 255MB maximum
4. **Unique Filenames**: Timestamped to prevent collisions
5. **User Isolation**: Files organized by user ID

## Code Locations

### Frontend:
- `src/pages/product/[slug].astro` - Product page with upload UI and script
- `src/components/product/ProductActions.astro` - Add to cart functionality

### Backend:
- `src/pages/api/upload/design-file.ts` - File upload API endpoint
- `src/pages/api/cart/add.ts` - Cart add with file support
- `src/lib/db.ts` - Order creation with file transfer
- `src/lib/r2.ts` - R2 upload utilities

### Database:
- `better-auth_migrations/2026-01-12T15-00-00.000Z_add_orderItems_file_columns.sql` - Migration

## Configuration

### Environment Variables Required:
```env
R2_API_KEY=https://[accountId].eu.r2.cloudflarestorage.com/[bucketName]
R2_ACCESS_KEY=your-access-key
R2_SECRET_KEY=your-secret-key
R2_CUSTOM_DOMAIN=https://your-domain.com (optional)
```

## Testing Checklist

- [ ] Upload valid PDF file (< 255MB)
- [ ] Attempt to upload non-PDF file (should show error)
- [ ] Attempt to upload file > 255MB (should show error)
- [ ] Verify file preview appears correctly
- [ ] Remove uploaded file and verify preview clears
- [ ] Add product to cart with uploaded file
- [ ] Verify file info appears in cart items
- [ ] Complete checkout
- [ ] Verify file info appears in order items
- [ ] Test file persistence across page navigations
- [ ] Test unauthorized upload (not logged in)

## Future Enhancements

1. **Multiple Files**: Allow uploading multiple design files per product
2. **File Preview**: Show actual PDF preview thumbnail
3. **File Management**: Admin interface to view/manage uploaded files
4. **File Cleanup**: Automatically delete unused files after X days
5. **Progress Bar**: Show upload progress for large files
6. **Drag & Drop**: Add drag-and-drop file upload interface
7. **File Versioning**: Track file version history for orders

## Notes

- Files are stored permanently in R2 once uploaded
- Files remain in R2 even if user doesn't complete purchase
- Consider implementing cleanup job for abandoned uploads
- File URLs use proxy endpoint by default (`/api/images/{key}`)
- Can configure custom domain in `R2_CUSTOM_DOMAIN` env variable
