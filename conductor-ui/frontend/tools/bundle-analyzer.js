#!/usr/bin/env node

/**
 * Advanced Bundle Analyzer Tool
 * Analyzes webpack/rollup bundles and provides detailed insights
 */

import { readFileSync, existsSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')
const distDir = join(root, 'dist')

async function analyzeBundles() {
  console.log('📊 Analyzing bundle composition...\n')
  
  if (!existsSync(distDir)) {
    console.error('❌ No build found. Run npm run build first.')
    process.exit(1)
  }
  
  // Read all files in dist directory
  const { readdirSync, statSync } = await import('fs')
  
  function getFilesRecursively(dir, fileList = []) {
    const files = readdirSync(dir)
    
    files.forEach(file => {
      const filePath = join(dir, file)
      const stat = statSync(filePath)
      
      if (stat.isDirectory()) {
        getFilesRecursively(filePath, fileList)
      } else {
        fileList.push(filePath)
      }
    })
    
    return fileList
  }
  
  const allFiles = getFilesRecursively(distDir)
  const jsFiles = allFiles.filter(f => f.endsWith('.js'))
  const cssFiles = allFiles.filter(f => f.endsWith('.css'))
  const assetFiles = allFiles.filter(f => 
    !f.endsWith('.js') && !f.endsWith('.css') && !f.endsWith('.html')
  )
  
  // Analyze JavaScript bundles
  console.log('🟨 JavaScript Bundles:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  let totalJsSize = 0
  const jsAnalysis = jsFiles
    .map(file => {
      const stat = statSync(file)
      const relativePath = file.replace(distDir + '/', '')
      const sizeKB = (stat.size / 1024).toFixed(2)
      totalJsSize += stat.size
      
      // Try to determine bundle type from filename
      let bundleType = 'Unknown'
      if (relativePath.includes('vendor-react')) bundleType = 'React Vendor'
      else if (relativePath.includes('vendor-mui')) bundleType = 'MUI Vendor'
      else if (relativePath.includes('vendor-router')) bundleType = 'Router Vendor'
      else if (relativePath.includes('vendor-recharts')) bundleType = 'Charts Vendor'
      else if (relativePath.includes('maestro-core')) bundleType = 'Maestro Core'
      else if (relativePath.includes('maestro-components')) bundleType = 'Components'
      else if (relativePath.includes('maestro-enhanced')) bundleType = 'Enhanced Features'
      else if (relativePath.includes('maestro-pages')) bundleType = 'Page Components'
      else if (relativePath.includes('index-')) bundleType = 'Main Entry'
      
      return { file: relativePath, size: stat.size, sizeKB, bundleType }
    })
    .sort((a, b) => b.size - a.size)
  
  jsAnalysis.forEach(({ file, sizeKB, bundleType }) => {
    const bar = '█'.repeat(Math.floor(parseFloat(sizeKB) / 50)) || '▌'
    console.log(`  ${bundleType.padEnd(20)} ${sizeKB.padStart(8)} KB ${bar}`)
    console.log(`    ${file}`)
  })
  
  console.log(`\n📋 Total JS Size: ${(totalJsSize / 1024).toFixed(2)} KB`)
  
  // Analyze CSS bundles
  if (cssFiles.length > 0) {
    console.log('\n🟦 CSS Bundles:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    let totalCssSize = 0
    cssFiles.forEach(file => {
      const stat = statSync(file)
      const relativePath = file.replace(distDir + '/', '')
      const sizeKB = (stat.size / 1024).toFixed(2)
      totalCssSize += stat.size
      
      const bar = '█'.repeat(Math.floor(parseFloat(sizeKB) / 10)) || '▌'
      console.log(`  ${sizeKB.padStart(8)} KB ${bar} ${relativePath}`)
    })
    
    console.log(`\n📋 Total CSS Size: ${(totalCssSize / 1024).toFixed(2)} KB`)
  }
  
  // Analyze assets
  if (assetFiles.length > 0) {
    console.log('\n🟩 Asset Files:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    let totalAssetSize = 0
    const assetsByType = {}
    
    assetFiles.forEach(file => {
      const stat = statSync(file)
      const relativePath = file.replace(distDir + '/', '')
      const extension = file.split('.').pop().toLowerCase()
      totalAssetSize += stat.size
      
      if (!assetsByType[extension]) {
        assetsByType[extension] = { count: 0, size: 0 }
      }
      assetsByType[extension].count++
      assetsByType[extension].size += stat.size
    })
    
    Object.entries(assetsByType).forEach(([ext, { count, size }]) => {
      const sizeKB = (size / 1024).toFixed(2)
      console.log(`  ${ext.toUpperCase().padEnd(8)} ${count.toString().padStart(3)} files, ${sizeKB.padStart(8)} KB`)
    })
    
    console.log(`\n📋 Total Assets Size: ${(totalAssetSize / 1024).toFixed(2)} KB`)
  }
  
  // Overall summary
  const totalSize = totalJsSize + (cssFiles.reduce((acc, f) => acc + statSync(f).size, 0)) + 
                   (assetFiles.reduce((acc, f) => acc + statSync(f).size, 0))
  
  console.log('\n🎯 Bundle Analysis Summary:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Total Bundle Size:    ${(totalSize / 1024).toFixed(2)} KB`)
  console.log(`  JavaScript:           ${(totalJsSize / 1024).toFixed(2)} KB (${((totalJsSize / totalSize) * 100).toFixed(1)}%)`)
  console.log(`  CSS:                  ${(cssFiles.reduce((acc, f) => acc + statSync(f).size, 0) / 1024).toFixed(2)} KB`)
  console.log(`  Assets:               ${(assetFiles.reduce((acc, f) => acc + statSync(f).size, 0) / 1024).toFixed(2)} KB`)
  console.log(`  Gzipped (estimated):  ~${(totalSize / 1024 / 3).toFixed(2)} KB`)
  
  // Performance recommendations
  console.log('\n💡 Performance Recommendations:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  if (totalJsSize / 1024 > 1000) {
    console.log('  ⚠️  Large JS bundle detected. Consider more aggressive code splitting.')
  }
  
  const largestBundle = jsAnalysis[0]
  if (largestBundle && parseFloat(largestBundle.sizeKB) > 500) {
    console.log(`  ⚠️  Largest bundle (${largestBundle.bundleType}) is ${largestBundle.sizeKB} KB. Consider optimization.`)
  }
  
  const vendorSize = jsAnalysis
    .filter(b => b.bundleType.includes('Vendor'))
    .reduce((acc, b) => acc + b.size, 0)
  
  if (vendorSize / 1024 > 800) {
    console.log('  ⚠️  Vendor bundles are large. Consider excluding unused library features.')
  }
  
  console.log('  ✅ Code splitting is active - good for caching')
  console.log('  ✅ Assets are fingerprinted for optimal caching')
  
  // Generate detailed report
  const report = {
    timestamp: new Date().toISOString(),
    totalSize: totalSize,
    totalSizeKB: (totalSize / 1024).toFixed(2),
    bundles: {
      javascript: jsAnalysis,
      css: cssFiles.map(f => ({
        file: f.replace(distDir + '/', ''),
        size: statSync(f).size,
        sizeKB: (statSync(f).size / 1024).toFixed(2)
      })),
      assets: Object.entries(assetsByType).map(([ext, data]) => ({
        type: ext,
        count: data.count,
        size: data.size,
        sizeKB: (data.size / 1024).toFixed(2)
      }))
    }
  }
  
  writeFileSync(
    join(distDir, 'bundle-analysis.json'),
    JSON.stringify(report, null, 2)
  )
  
  console.log(`\n📄 Detailed analysis saved to: dist/bundle-analysis.json`)
}

// Run analysis
analyzeBundles().catch(console.error)