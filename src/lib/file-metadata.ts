import sharp from 'sharp';

export interface FileMetadata {
  fileType: 'pdf' | 'png';
  width?: number;
  height?: number;
  dpi?: number;
  fileSize: number;
  meetsRequirements: boolean;
  warnings: string[];
}

export interface FileRequirements {
  requiredDpi?: number;
  requiredMinWidth?: number;
  requiredMinHeight?: number;
  allowedFileTypes: string;
}

/**
 * Extract metadata from PNG image file
 */
async function extractPngMetadata(buffer: Buffer): Promise<Partial<FileMetadata>> {
  try {
    const metadata = await sharp(buffer).metadata();

    // Extract DPI from PNG metadata
    // PNG stores density in pixels per meter, convert to DPI
    const dpi = metadata.density
      ? Math.round(metadata.density * 0.0254) // Convert pixels/meter to DPI
      : undefined;

    return {
      width: metadata.width,
      height: metadata.height,
      dpi: dpi,
    };
  } catch (error) {
    console.error('Error extracting PNG metadata:', error);
    return {};
  }
}

/**
 * Extract metadata from PDF file
 */
async function extractPdfMetadata(buffer: Buffer): Promise<Partial<FileMetadata>> {
  try {
    // For PDF files, we can't easily get DPI without rendering
    // We'll mark it as needing manual review
    // In production, you might want to use pdf-lib or pdf.js for more detailed analysis

    // Basic PDF validation - check if it's a valid PDF
    const pdfHeader = buffer.toString('utf8', 0, 5);
    if (pdfHeader !== '%PDF-') {
      throw new Error('Invalid PDF file');
    }

    return {
      // PDF metadata extraction would require pdf-lib or similar
      // For now, we'll just validate it's a PDF and require manual review
    };
  } catch (error) {
    console.error('Error extracting PDF metadata:', error);
    return {};
  }
}

/**
 * Validate file against requirements and generate warnings
 */
function validateFileMetadata(
  metadata: Partial<FileMetadata>,
  requirements: FileRequirements,
  fileType: 'pdf' | 'png'
): { meetsRequirements: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let meetsRequirements = true;

  // Check file type
  const allowedTypes = requirements.allowedFileTypes.split(',').map(t => t.trim());
  if (!allowedTypes.includes(fileType)) {
    warnings.push(`Dateityp ${fileType.toUpperCase()} ist nicht erlaubt. Erlaubte Typen: ${requirements.allowedFileTypes.toUpperCase()}`);
    meetsRequirements = false;
  }

  // For PNG files, we can check detailed requirements
  if (fileType === 'png') {
    // Check DPI
    if (requirements.requiredDpi && metadata.dpi) {
      if (metadata.dpi < requirements.requiredDpi) {
        warnings.push(
          `Niedrige DPI: ${metadata.dpi} DPI (Empfohlen: ${requirements.requiredDpi} DPI für beste Druckqualität)`
        );
        meetsRequirements = false;
      }
    } else if (requirements.requiredDpi && !metadata.dpi) {
      warnings.push(
        `DPI-Information nicht gefunden. Bitte stellen Sie sicher, dass die Datei mindestens ${requirements.requiredDpi} DPI hat.`
      );
      // Don't mark as not meeting requirements, just warn
    }

    // Check width
    if (requirements.requiredMinWidth && metadata.width) {
      if (metadata.width < requirements.requiredMinWidth) {
        warnings.push(
          `Bildbreite zu gering: ${metadata.width}px (Mindestens ${requirements.requiredMinWidth}px erforderlich)`
        );
        meetsRequirements = false;
      }
    }

    // Check height
    if (requirements.requiredMinHeight && metadata.height) {
      if (metadata.height < requirements.requiredMinHeight) {
        warnings.push(
          `Bildhöhe zu gering: ${metadata.height}px (Mindestens ${requirements.requiredMinHeight}px erforderlich)`
        );
        meetsRequirements = false;
      }
    }

    // Add info message if everything is good
    if (warnings.length === 0 && metadata.width && metadata.height && metadata.dpi) {
      warnings.push(
        `✓ Qualität ausgezeichnet: ${metadata.width}x${metadata.height}px @ ${metadata.dpi} DPI`
      );
    }
  } else if (fileType === 'pdf') {
    // For PDF files, we need manual verification
    warnings.push(
      `PDF-Datei hochgeladen. Bitte stellen Sie sicher, dass Ihre PDF-Datei mindestens ${requirements.requiredDpi || 300} DPI hat.`
    );
  }

  return { meetsRequirements, warnings };
}

/**
 * Extract complete metadata from file buffer
 */
export async function extractFileMetadata(
  buffer: Buffer,
  fileName: string,
  fileType: 'pdf' | 'png',
  requirements: FileRequirements
): Promise<FileMetadata> {
  let metadata: Partial<FileMetadata> = {};

  // Extract metadata based on file type
  if (fileType === 'png') {
    metadata = await extractPngMetadata(buffer);
  } else if (fileType === 'pdf') {
    metadata = await extractPdfMetadata(buffer);
  }

  // Validate against requirements
  const validation = validateFileMetadata(metadata, requirements, fileType);

  return {
    fileType,
    width: metadata.width,
    height: metadata.height,
    dpi: metadata.dpi,
    fileSize: buffer.length,
    meetsRequirements: validation.meetsRequirements,
    warnings: validation.warnings,
  };
}

/**
 * Validate design file for print production
 */
export function validateDesignFileWithRequirements(
  file: { size: number; type: string; name: string },
  requirements: FileRequirements,
  maxSizeMB: number = 255
): { valid: boolean; error?: string } {
  const allowedTypes = requirements.allowedFileTypes.split(',').map(t => t.trim().toLowerCase());

  // Build MIME type list
  const mimeTypes: string[] = [];
  if (allowedTypes.includes('pdf')) {
    mimeTypes.push('application/pdf');
  }
  if (allowedTypes.includes('png')) {
    mimeTypes.push('image/png');
  }

  // Check file type
  const fileName = file.name.toLowerCase();
  const hasValidMime = mimeTypes.includes(file.type);
  const hasValidExtension = allowedTypes.some(ext => fileName.endsWith(`.${ext}`));

  if (!hasValidMime && !hasValidExtension) {
    const allowedTypesUpper = allowedTypes.map(t => t.toUpperCase()).join(', ');
    return {
      valid: false,
      error: `Ungültiger Dateityp. Erlaubt: ${allowedTypesUpper}`,
    };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Dateigröße überschreitet ${maxSizeMB}MB Limit.`,
    };
  }

  return { valid: true };
}
