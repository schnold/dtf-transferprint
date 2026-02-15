/**
 * Script to optimize hero images by creating responsive versions
 * Run: node scripts/optimize-hero-images.js
 */

import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HERO_DIR = join(__dirname, '..', 'public', 'images', 'landing-page', 'hero');
const SIZES = [
	{ width: 640, suffix: '-mobile' },
	{ width: 1024, suffix: '-tablet' },
	{ width: 1920, suffix: '-desktop' },
];
const QUALITY = 85; // WebP quality

async function optimizeImages() {
	try {
		const files = await readdir(HERO_DIR);
		const webpFiles = files.filter(f => f.endsWith('.webp'));

		console.log(`Found ${webpFiles.length} hero images to optimize...`);

		for (const file of webpFiles) {
			const inputPath = join(HERO_DIR, file);
			const fileStat = await stat(inputPath);
			const originalSize = (fileStat.size / 1024).toFixed(2);

			console.log(`\n Processing ${file} (${originalSize}KB)...`);

			// Check if this is already a sized version (skip if so)
			if (file.includes('-mobile') || file.includes('-tablet') || file.includes('-desktop')) {
				console.log(`  Skipping (already sized)`);
				continue;
			}

			// Create responsive versions
			for (const size of SIZES) {
				const outputFile = file.replace('.webp', `${size.suffix}.webp`);
				const outputPath = join(HERO_DIR, outputFile);

				await sharp(inputPath)
					.resize(size.width, null, {
						fit: 'inside',
						withoutEnlargement: true,
					})
					.webp({ quality: QUALITY })
					.toFile(outputPath);

				const outputStat = await stat(outputPath);
				const outputSize = (outputStat.size / 1024).toFixed(2);
				const savings = ((1 - outputStat.size / fileStat.size) * 100).toFixed(1);

				console.log(`  ✓ Created ${outputFile} (${outputSize}KB, ${savings}% smaller)`);
			}
		}

		console.log('\n✓ All hero images optimized!');
	} catch (error) {
		console.error('Error optimizing images:', error);
		process.exit(1);
	}
}

optimizeImages();
