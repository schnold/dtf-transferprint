import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif', '.bmp'];
const WEBP_QUALITY = 85; // Adjust quality (0-100)
const DELETE_ORIGINALS = false; // Set to true to delete original files after conversion

interface ConversionStats {
  total: number;
  converted: number;
  skipped: number;
  failed: number;
}

/**
 * Recursively get all image files in a directory
 */
function getAllImageFiles(dir: string): string[] {
  const files: string[] = [];

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllImageFiles(fullPath));
    } else if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase();
      if (SUPPORTED_FORMATS.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Convert a single image to WebP
 */
async function convertToWebP(inputPath: string): Promise<boolean> {
  try {
    const outputPath = inputPath.replace(/\.[^.]+$/, '.webp');

    // Skip if WebP version already exists
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  Skipped (already exists): ${path.relative(IMAGES_DIR, outputPath)}`);
      return false;
    }

    // Convert to WebP
    await sharp(inputPath)
      .webp({ quality: WEBP_QUALITY })
      .toFile(outputPath);

    const inputSize = fs.statSync(inputPath).size;
    const outputSize = fs.statSync(outputPath).size;
    const savings = ((1 - outputSize / inputSize) * 100).toFixed(1);

    console.log(`✅ Converted: ${path.relative(IMAGES_DIR, inputPath)} → ${path.basename(outputPath)} (${savings}% smaller)`);

    // Delete original if configured
    if (DELETE_ORIGINALS) {
      fs.unlinkSync(inputPath);
      console.log(`🗑️  Deleted original: ${path.relative(IMAGES_DIR, inputPath)}`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Failed to convert: ${path.relative(IMAGES_DIR, inputPath)}`);
    console.error(error);
    return false;
  }
}

/**
 * Main conversion function
 */
async function convertAllImages() {
  console.log('🔍 Scanning for images...\n');

  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Directory not found: ${IMAGES_DIR}`);
    process.exit(1);
  }

  const imageFiles = getAllImageFiles(IMAGES_DIR);

  if (imageFiles.length === 0) {
    console.log('No images found to convert.');
    return;
  }

  console.log(`Found ${imageFiles.length} image(s) to process\n`);
  console.log(`Settings:`);
  console.log(`  - Quality: ${WEBP_QUALITY}%`);
  console.log(`  - Delete originals: ${DELETE_ORIGINALS ? 'Yes' : 'No'}\n`);
  console.log('━'.repeat(60));
  console.log('');

  const stats: ConversionStats = {
    total: imageFiles.length,
    converted: 0,
    skipped: 0,
    failed: 0
  };

  for (const imagePath of imageFiles) {
    const result = await convertToWebP(imagePath);
    if (result === true) {
      stats.converted++;
    } else if (result === false) {
      stats.skipped++;
    }
  }

  stats.failed = stats.total - stats.converted - stats.skipped;

  console.log('');
  console.log('━'.repeat(60));
  console.log('\n📊 Conversion Summary:');
  console.log(`  Total images: ${stats.total}`);
  console.log(`  Converted: ${stats.converted}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log('\n✨ Done!');
}

// Run the conversion
convertAllImages().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
