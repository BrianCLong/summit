#!/usr/bin/env node

/**
 * Bundle analyzer for React Native app
 *
 * Usage:
 *   node scripts/analyze-bundle.js [platform]
 *
 * Platforms: ios, android (default: both)
 */

const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const platform = process.argv[2] || 'both';

console.log('🔍 Analyzing React Native bundle...\n');

/**
 * Analyze Android bundle
 */
function analyzeAndroid() {
  console.log('📱 Android Bundle Analysis:');
  console.log('━'.repeat(50));

  try {
    // Build release bundle
    console.log('Building Android release bundle...');
    execSync('cd android && ./gradlew bundleRelease', {stdio: 'inherit'});

    // Get bundle size
    const bundlePath = path.join(
      __dirname,
      '../android/app/build/outputs/bundle/release/app-release.aab',
    );

    if (fs.existsSync(bundlePath)) {
      const stats = fs.statSync(bundlePath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log(`\n✅ Bundle size: ${sizeInMB} MB`);
      console.log(`📁 Location: ${bundlePath}\n`);

      // Analyze APK if available
      analyzeAPK();
    } else {
      console.log('❌ Bundle file not found');
    }
  } catch (error) {
    console.error('❌ Android analysis failed:', error.message);
  }
}

/**
 * Analyze APK
 */
function analyzeAPK() {
  try {
    // Build release APK
    console.log('Building Android release APK...');
    execSync('cd android && ./gradlew assembleRelease', {stdio: 'inherit'});

    const apkPath = path.join(
      __dirname,
      '../android/app/build/outputs/apk/release/app-release.apk',
    );

    if (fs.existsSync(apkPath)) {
      const stats = fs.statSync(apkPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log(`\n✅ APK size: ${sizeInMB} MB`);
      console.log(`📁 Location: ${apkPath}\n`);

      // Analyze APK contents
      console.log('APK Contents:');
      try {
        const output = execSync(`unzip -l "${apkPath}" | tail -1`, {
          encoding: 'utf-8',
        });
        console.log(output);
      } catch (err) {
        // Ignore unzip errors
      }
    }
  } catch (error) {
    console.error('❌ APK analysis failed:', error.message);
  }
}

/**
 * Analyze iOS bundle
 */
function analyzeIOS() {
  console.log('📱 iOS Bundle Analysis:');
  console.log('━'.repeat(50));

  try {
    // Build iOS release
    console.log('Building iOS release bundle...');
    console.log('Note: This requires Xcode to be installed\n');

    const appPath = path.join(
      __dirname,
      '../ios/build/Build/Products/Release-iphoneos/IntelGraph.app',
    );

    if (fs.existsSync(appPath)) {
      // Get bundle size
      const output = execSync(`du -sh "${appPath}"`, {encoding: 'utf-8'});
      console.log(`✅ App bundle size: ${output.split('\t')[0]}`);
      console.log(`📁 Location: ${appPath}\n`);
    } else {
      console.log('⚠️  iOS app not found. Run: npm run ios:release');
    }
  } catch (error) {
    console.error('❌ iOS analysis failed:', error.message);
  }
}

/**
 * Analyze JavaScript bundle
 */
function analyzeJSBundle() {
  console.log('📦 JavaScript Bundle Analysis:');
  console.log('━'.repeat(50));

  try {
    // Create bundle
    console.log('Creating JavaScript bundle...');

    const bundlePath = path.join(__dirname, '../dist/index.bundle.js');
    const mapPath = path.join(__dirname, '../dist/index.bundle.js.map');

    // Ensure dist directory exists
    if (!fs.existsSync(path.join(__dirname, '../dist'))) {
      fs.mkdirSync(path.join(__dirname, '../dist'));
    }

    // Bundle for Android
    execSync(
      `npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output "${bundlePath}" --sourcemap-output "${mapPath}"`,
      {stdio: 'inherit'},
    );

    if (fs.existsSync(bundlePath)) {
      const stats = fs.statSync(bundlePath);
      const sizeInKB = (stats.size / 1024).toFixed(2);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log(`\n✅ JS Bundle size: ${sizeInKB} KB (${sizeInMB} MB)`);
      console.log(`📁 Location: ${bundlePath}\n`);

      // Analyze bundle composition
      console.log('Bundle Composition:');
      console.log('  - Use source-map-explorer to analyze:');
      console.log(`    npx source-map-explorer "${bundlePath}" "${mapPath}"\n`);
    }
  } catch (error) {
    console.error('❌ JS bundle analysis failed:', error.message);
  }
}

/**
 * Get module sizes
 */
function analyzeModuleSizes() {
  console.log('📊 Module Size Analysis:');
  console.log('━'.repeat(50));

  try {
    const packageJson = require('../package.json');
    const dependencies = packageJson.dependencies || {};

    console.log('\nTop dependencies by install size:');
    console.log('(Use: npm install -g cost-of-modules && cost-of-modules)\n');

    // Show key dependencies
    const keyDeps = [
      'react-native',
      '@react-navigation/native',
      '@apollo/client',
      'react-native-reanimated',
      '@shopify/react-native-skia',
      'react-native-maps',
    ];

    keyDeps.forEach((dep) => {
      if (dependencies[dep]) {
        console.log(`  ${dep}: ${dependencies[dep]}`);
      }
    });
  } catch (error) {
    console.error('❌ Module analysis failed:', error.message);
  }
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations() {
  console.log('\n💡 Optimization Recommendations:');
  console.log('━'.repeat(50));

  console.log(`
1. Bundle Size Optimization:
   ✓ Use Hermes engine (already enabled)
   ✓ Enable Proguard/R8 for Android
   ✓ Use code splitting for large screens
   ✓ Remove unused dependencies

2. Asset Optimization:
   ✓ Compress images (use WebP format)
   ✓ Remove unused assets
   ✓ Use vector icons instead of PNG

3. Code Optimization:
   ✓ Enable inline requires in metro.config.js (already enabled)
   ✓ Use React.lazy() for code splitting
   ✓ Minimize console.log in production (already configured)

4. Dependency Optimization:
   ✓ Replace large dependencies with smaller alternatives
   ✓ Use selective imports (e.g., lodash/get instead of lodash)
   ✓ Remove duplicate dependencies

5. Build Optimization:
   ✓ Enable minification in release builds
   ✓ Use Bundle Analyzer to identify large modules
   ✓ Consider using dynamic imports for large features
  `);
}

/**
 * Main execution
 */
function main() {
  console.log('Starting bundle analysis...\n');

  // Analyze JS bundle first (platform-agnostic)
  analyzeJSBundle();

  // Analyze platform-specific bundles
  if (platform === 'android' || platform === 'both') {
    analyzeAndroid();
  }

  if (platform === 'ios' || platform === 'both') {
    analyzeIOS();
  }

  // Analyze module sizes
  analyzeModuleSizes();

  // Generate recommendations
  generateRecommendations();

  console.log('\n✅ Bundle analysis complete!\n');
}

// Run analysis
main();
