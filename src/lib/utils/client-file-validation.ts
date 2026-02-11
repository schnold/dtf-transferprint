/**
 * Client-Side File Validation Utility
 * Validates files before upload using browser APIs
 * Provides instant feedback to users about file quality
 */

export interface ClientFileRequirements {
  allowedFileTypes: string; // "PDF,PNG,JPG"
  maxFileSizeMb: number;
  requiredDpi?: number;
  requiredMinWidth?: number;
  requiredMinHeight?: number;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  fileType: string;
  fileSize: number;
  estimatedDpi?: number;
}

export interface ClientValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: FileMetadata;
}

/**
 * Extract image dimensions from image file using Canvas API
 */
async function extractImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const dimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Get file extension from filename
 */
function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toUpperCase() || '';
}

/**
 * Check if file type is allowed
 */
function isFileTypeAllowed(file: File, allowedTypes: string): boolean {
  const extension = getFileExtension(file.name);
  const allowedTypesArray = allowedTypes.split(',').map((t) => t.trim().toUpperCase());

  return allowedTypesArray.includes(extension);
}

/**
 * Check if file is an image type that can be inspected
 */
function isInspectableImage(file: File): boolean {
  const extension = getFileExtension(file.name);
  const inspectableTypes = ['PNG', 'JPG', 'JPEG'];

  return inspectableTypes.includes(extension);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Main validation function - validates file before upload
 */
export async function validateFileBeforeUpload(
  file: File,
  requirements: ClientFileRequirements
): Promise<ClientValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let metadata: FileMetadata | undefined;

  // Extract file metadata
  const fileType = getFileExtension(file.name);
  const fileSizeMb = file.size / (1024 * 1024);

  // 1. Validate file type
  if (!isFileTypeAllowed(file, requirements.allowedFileTypes)) {
    errors.push(
      `Dateityp ${fileType} ist nicht erlaubt. Erlaubte Typen: ${requirements.allowedFileTypes}`
    );
  }

  // 2. Validate file size
  if (fileSizeMb > requirements.maxFileSizeMb) {
    errors.push(
      `Datei ist zu groß (${formatFileSize(file.size)}). Maximal erlaubt: ${requirements.maxFileSizeMb} MB`
    );
  }

  // 3. For images, extract dimensions and validate
  if (isInspectableImage(file)) {
    const dimensions = await extractImageDimensions(file);

    if (dimensions) {
      metadata = {
        width: dimensions.width,
        height: dimensions.height,
        fileType,
        fileSize: file.size,
      };

      // Validate minimum width
      if (requirements.requiredMinWidth && dimensions.width < requirements.requiredMinWidth) {
        errors.push(
          `Bildbreite zu gering: ${dimensions.width}px (Mindestens ${requirements.requiredMinWidth}px erforderlich)`
        );
      }

      // Validate minimum height
      if (requirements.requiredMinHeight && dimensions.height < requirements.requiredMinHeight) {
        errors.push(
          `Bildhöhe zu gering: ${dimensions.height}px (Mindestens ${requirements.requiredMinHeight}px erforderlich)`
        );
      }

      // Warning about DPI (cannot be accurately determined client-side without EXIF)
      if (requirements.requiredDpi) {
        warnings.push(
          `Empfohlene DPI: ${requirements.requiredDpi} DPI für beste Druckqualität`
        );
      }

      // Success message if dimensions are good
      if (
        (!requirements.requiredMinWidth || dimensions.width >= requirements.requiredMinWidth) &&
        (!requirements.requiredMinHeight || dimensions.height >= requirements.requiredMinHeight)
      ) {
        warnings.push(
          `✓ Abmessungen ausgezeichnet: ${dimensions.width}x${dimensions.height}px`
        );
      }
    } else {
      warnings.push('Bildabmessungen konnten nicht ermittelt werden');
    }
  } else {
    // For non-image files (PDF, etc.), just provide basic metadata
    metadata = {
      fileType,
      fileSize: file.size,
    };

    if (requirements.requiredDpi) {
      warnings.push(
        `Für ${fileType}-Dateien: Bitte stellen Sie sicher, dass die Datei ${requirements.requiredDpi} DPI oder höher hat`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  return errors.map((error, index) => `${index + 1}. ${error}`).join('\n');
}

/**
 * Format validation warnings for display
 */
export function formatValidationWarnings(warnings: string[]): string {
  if (warnings.length === 0) return '';
  return warnings.join('\n');
}
