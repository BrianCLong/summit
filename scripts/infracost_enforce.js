#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Infracost Budget Enforcement Script
 * Analyzes cost changes and enforces budget limits for infrastructure changes
 */

function main() {
  try {
    // Read the Infracost diff JSON file
    const infracostPath = path.join(process.cwd(), 'infracost_diff.json');
    const fallbackPath = path.join(process.cwd(), 'infracost.json');
    
    let data;
    if (fs.existsSync(infracostPath)) {
      data = JSON.parse(fs.readFileSync(infracostPath, 'utf8'));
    } else if (fs.existsSync(fallbackPath)) {
      data = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
    } else {
      console.error('❌ No Infracost data found');
      process.exit(1);
    }

    // Extract cost delta information
    const projects = data.projects || [];
    let totalDelta = 0;
    let hasBreakdown = false;

    for (const project of projects) {
      if (project.diff && project.diff.totalMonthlyCost) {
        totalDelta += parseFloat(project.diff.totalMonthlyCost) || 0;
        hasBreakdown = true;
      } else if (project.breakdown && project.breakdown.totalMonthlyCost) {
        // Fallback to current cost if no diff available
        totalDelta += parseFloat(project.breakdown.totalMonthlyCost) || 0;
        hasBreakdown = true;
      }
    }

    if (!hasBreakdown) {
      console.warn('⚠️ No cost breakdown found, skipping enforcement');
      process.exit(0);
    }

    // Get budget limit from environment
    const LIMIT = parseFloat(process.env.INFRACOST_LIMIT || '50'); // Default $50/month
    const WARNING_THRESHOLD = LIMIT * 0.8; // Warn at 80% of limit

    console.log(`💰 Cost Analysis Results:`);
    console.log(`   Monthly cost delta: $${totalDelta.toFixed(2)}`);
    console.log(`   Budget limit: $${LIMIT.toFixed(2)}`);
    console.log(`   Warning threshold: $${WARNING_THRESHOLD.toFixed(2)}`);

    // Check if we exceed the limit
    if (totalDelta > LIMIT) {
      console.error(`❌ BUDGET EXCEEDED: Cost delta $${totalDelta.toFixed(2)} > limit $${LIMIT.toFixed(2)}`);
      console.error(`   This PR would increase monthly costs by $${totalDelta.toFixed(2)}`);
      console.error(`   Please optimize your infrastructure changes or request budget increase`);
      
      // Provide helpful suggestions
      console.log(`\n💡 Suggestions to reduce costs:`);
      console.log(`   • Use smaller instance types where possible`);
      console.log(`   • Enable auto-scaling to optimize resource usage`);
      console.log(`   • Consider reserved instances for predictable workloads`);
      console.log(`   • Review storage classes and lifecycle policies`);
      
      process.exit(1);
    } else if (totalDelta > WARNING_THRESHOLD) {
      console.warn(`⚠️ WARNING: Cost delta $${totalDelta.toFixed(2)} approaching limit $${LIMIT.toFixed(2)}`);
      console.warn(`   Consider reviewing the infrastructure changes for optimization opportunities`);
    } else if (totalDelta > 0) {
      console.log(`✅ Cost increase $${totalDelta.toFixed(2)} within budget limit`);
    } else if (totalDelta < 0) {
      console.log(`🎉 Great! This change will SAVE $${Math.abs(totalDelta).toFixed(2)} per month`);
    } else {
      console.log(`✅ No cost impact detected`);
    }

    // Log resource-level details if available
    for (const project of projects) {
      if (project.diff && project.diff.resources) {
        console.log(`\n📊 Resource changes in ${project.name || 'project'}:`);
        
        project.diff.resources.forEach(resource => {
          const costDelta = parseFloat(resource.monthlyCost || 0);
          if (costDelta !== 0) {
            const sign = costDelta > 0 ? '+' : '';
            console.log(`   ${resource.name}: ${sign}$${costDelta.toFixed(2)}/month`);
          }
        });
      }
    }

    console.log(`\n✅ Budget enforcement completed successfully`);

  } catch (error) {
    console.error(`❌ Error during budget enforcement: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };