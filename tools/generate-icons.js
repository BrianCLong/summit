#!/usr/bin/env node

/**
 * Icon Generator for Mobile Apps
 * Generates all required icon sizes for iOS, Android, and PWA
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Icon sizes for different platforms
const ICON_SIZES = {
  ios: [
    {size: 20, scale: [1, 2, 3], name: 'icon-20'},
    {size: 29, scale: [1, 2, 3], name: 'icon-29'},
    {size: 40, scale: [1, 2, 3], name: 'icon-40'},
    {size: 60, scale: [2, 3], name: 'icon-60'},
    {size: 76, scale: [1, 2], name: 'icon-76'},
    {size: 83.5, scale: [2], name: 'icon-83.5'},
    {size: 1024, scale: [1], name: 'icon-1024'}, // App Store
  ],
  android: [
    {size: 36, name: 'ldpi'},
    {size: 48, name: 'mdpi'},
    {size: 72, name: 'hdpi'},
    {size: 96, name: 'xhdpi'},
    {size: 144, name: 'xxhdpi'},
    {size: 192, name: 'xxxhdpi'},
  ],
  pwa: [
    {size: 72, name: 'icon-72x72'},
    {size: 96, name: 'icon-96x96'},
    {size: 128, name: 'icon-128x128'},
    {size: 144, name: 'icon-144x144'},
    {size: 152, name: 'icon-152x152'},
    {size: 192, name: 'icon-192x192'},
    {size: 384, name: 'icon-384x384'},
    {size: 512, name: 'icon-512x512'},
  ],
};

async function generateIcons(inputPath, outputDir) {
  console.log('🎨 Starting icon generation...\n');

  try {
    // Verify input file exists
    await fs.access(inputPath);
    console.log(`✓ Input file found: ${inputPath}\n`);
  } catch (error) {
    console.error(`✗ Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Create output directories
  const dirs = {
    ios: path.join(outputDir, 'ios'),
    android: path.join(outputDir, 'android'),
    pwa: path.join(outputDir, 'pwa'),
  };

  for (const [platform, dir] of Object.entries(dirs)) {
    try {
      await fs.mkdir(dir, {recursive: true});
      console.log(`✓ Created ${platform} directory: ${dir}`);
    } catch (error) {
      console.error(`✗ Error creating ${platform} directory:`, error.message);
    }
  }

  console.log('');

  // Generate iOS icons
  console.log('📱 Generating iOS icons...');
  for (const icon of ICON_SIZES.ios) {
    for (const scale of icon.scale) {
      const size = Math.round(icon.size * scale);
      const filename = `${icon.name}@${scale}x.png`;
      const outputPath = path.join(dirs.ios, filename);

      try {
        await sharp(inputPath)
          .resize(size, size, {
            fit: 'contain',
            background: {r: 0, g: 0, b: 0, alpha: 0},
          })
          .png()
          .toFile(outputPath);

        console.log(`  ✓ ${filename} (${size}x${size})`);
      } catch (error) {
        console.error(`  ✗ Failed to generate ${filename}:`, error.message);
      }
    }
  }

  // Generate Android icons
  console.log('\n🤖 Generating Android icons...');
  for (const icon of ICON_SIZES.android) {
    const filename = `ic_launcher_${icon.name}.png`;
    const outputPath = path.join(dirs.android, filename);

    try {
      await sharp(inputPath)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: {r: 0, g: 0, b: 0, alpha: 0},
        })
        .png()
        .toFile(outputPath);

      console.log(`  ✓ ${filename} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`  ✗ Failed to generate ${filename}:`, error.message);
    }
  }

  // Generate PWA icons
  console.log('\n🌐 Generating PWA icons...');
  for (const icon of ICON_SIZES.pwa) {
    const filename = `${icon.name}.png`;
    const outputPath = path.join(dirs.pwa, filename);

    try {
      await sharp(inputPath)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: {r: 0, g: 0, b: 0, alpha: 0},
        })
        .png()
        .toFile(outputPath);

      console.log(`  ✓ ${filename} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`  ✗ Failed to generate ${filename}:`, error.message);
    }
  }

  // Generate adaptive icons for Android
  console.log('\n🎭 Generating Android adaptive icons...');
  const adaptiveDir = path.join(dirs.android, 'adaptive');
  await fs.mkdir(adaptiveDir, {recursive: true});

  // Foreground layer (108dp safe zone with 72dp icon)
  try {
    await sharp(inputPath)
      .resize(108, 108, {
        fit: 'contain',
        background: {r: 0, g: 0, b: 0, alpha: 0},
      })
      .extend({
        top: 18,
        bottom: 18,
        left: 18,
        right: 18,
        background: {r: 0, g: 0, b: 0, alpha: 0},
      })
      .png()
      .toFile(path.join(adaptiveDir, 'ic_launcher_foreground.png'));

    console.log(`  ✓ ic_launcher_foreground.png (108x108 with safe zone)`);
  } catch (error) {
    console.error(`  ✗ Failed to generate adaptive foreground:`, error.message);
  }

  // Background layer (solid color)
  try {
    await sharp({
      create: {
        width: 108,
        height: 108,
        channels: 4,
        background: {r: 37, g: 99, b: 235, alpha: 1}, // theme primary color
      },
    })
      .png()
      .toFile(path.join(adaptiveDir, 'ic_launcher_background.png'));

    console.log(`  ✓ ic_launcher_background.png (108x108 solid color)`);
  } catch (error) {
    console.error(`  ✗ Failed to generate adaptive background:`, error.message);
  }

  // Generate splash screens
  console.log('\n🖼️  Generating splash screens...');
  const splashSizes = [
    {width: 1242, height: 2688, name: 'splash-iphone-xs-max'},
    {width: 1125, height: 2436, name: 'splash-iphone-x'},
    {width: 750, height: 1334, name: 'splash-iphone-8'},
    {width: 2048, height: 2732, name: 'splash-ipad-pro-12.9'},
    {width: 1668, height: 2388, name: 'splash-ipad-pro-11'},
  ];

  const splashDir = path.join(outputDir, 'splash');
  await fs.mkdir(splashDir, {recursive: true});

  for (const splash of splashSizes) {
    const filename = `${splash.name}.png`;
    const outputPath = path.join(splashDir, filename);

    try {
      // Create splash with centered icon
      const iconSize = Math.min(splash.width, splash.height) * 0.3;

      await sharp(inputPath)
        .resize(Math.round(iconSize), Math.round(iconSize), {
          fit: 'contain',
          background: {r: 0, g: 0, b: 0, alpha: 0},
        })
        .extend({
          top: Math.round((splash.height - iconSize) / 2),
          bottom: Math.round((splash.height - iconSize) / 2),
          left: Math.round((splash.width - iconSize) / 2),
          right: Math.round((splash.width - iconSize) / 2),
          background: {r: 255, g: 255, b: 255, alpha: 1},
        })
        .png()
        .toFile(outputPath);

      console.log(`  ✓ ${filename} (${splash.width}x${splash.height})`);
    } catch (error) {
      console.error(`  ✗ Failed to generate ${filename}:`, error.message);
    }
  }

  console.log('\n✨ Icon generation complete!\n');
  console.log('Generated icons:');
  console.log(`  iOS: ${dirs.ios}`);
  console.log(`  Android: ${dirs.android}`);
  console.log(`  PWA: ${dirs.pwa}`);
  console.log(`  Splash: ${splashDir}`);
  console.log('');
}

// CLI
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node generate-icons.js <input-image> <output-directory>');
  console.log('');
  console.log('Example:');
  console.log('  node generate-icons.js logo.png ./assets/icons');
  console.log('');
  console.log('Input image requirements:');
  console.log('  - Minimum size: 1024x1024 pixels');
  console.log('  - Format: PNG with transparency');
  console.log('  - Square aspect ratio');
  process.exit(1);
}

const [inputPath, outputDir] = args;

generateIcons(inputPath, outputDir).catch((error) => {
  console.error('\n✗ Error:', error.message);
  process.exit(1);
});
