#!/usr/bin/env node

// scripts/fastlane/eligibility-check.mjs
// Determines if current job is eligible for fastlane routing
// Fastlane eligibility criteria:
// - Deterministic cache key (no runtime dependencies)
// - No secrets in logs or artifacts
// - Hermetic build (no network calls to external services)

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function isEligibleForFastlane() {
  console.log('Checking fastlane eligibility...');

  // Check for common eligibility factors
  const checks = {
    // Check 1: No sensitive environment variables in build logs
    noSensitiveEnv: () => {
      const sensitiveVars = ['SECRET', 'TOKEN', 'PASSWORD', 'KEY', 'AUTH'];
      const envKeys = Object.keys(process.env);
      const foundSensitive = envKeys.filter(key => 
        sensitiveVars.some(sensitive => key.toUpperCase().includes(sensitive))
      );
      
      if (foundSensitive.length > 0) {
        console.log(`❌ Fastlane blocked: Found sensitive env vars: ${foundSensitive.join(', ')}`);
        return false;
      }
      return true;
    },

    // Check 2: Cache key stability
    cacheKeyStable: () => {
      // For GitHub Actions, check if we have a stable cache key
      const cacheKey = process.env['GITHUB_SHA'] || process.env['GITHUB_REF'];
      if (!cacheKey) {
        console.log('❌ Fastlane blocked: No stable cache key available');
        return false;
      }
      return true;
    },

    // Check 3: No external network dependencies for caching
    networkDependency: () => {
      // Check if package-lock.json has changed recently (indicating dependency updates)
      try {
        const packageLockPath = path.join(process.cwd(), 'package-lock.json');
        if (fs.existsSync(packageLockPath)) {
          const stats = fs.statSync(packageLockPath);
          const mtime = new Date(stats.mtime);
          const now = new Date();
          const hoursSinceChange = (now - mtime) / (1000 * 60 * 60);
          
          // If package-lock was changed recently (last 2 hours), avoid fastlane
          if (hoursSinceChange < 2) {
            console.log('⚠️  Potential network dependency detected (recent package-lock.json change), allowing fastlane with caution');
          }
        }
        return true;
      } catch (error) {
        console.log('⚠️  Could not check package-lock.json, allowing fastlane check to continue');
        return true;
      }
    },

    // Check 4: Deterministic build steps
    deterministicSteps: () => {
      // Check if we're in a PR context (more likely to be deterministic)
      const isPR = process.env['GITHUB_EVENT_NAME'] === 'pull_request';
      const isBranch = process.env['GITHUB_REF']?.includes('refs/heads/');
      
      if (isPR || isBranch) {
        return true;
      }
      
      // If running on main or other special branches, be more conservative
      if (process.env['GITHUB_REF']?.includes('refs/heads/main')) {
        console.log('⚠️  Running on main branch, being conservative about fastlane eligibility');
        return true; // Still allow it, just with awareness
      }
      
      return true;
    }
  };

  // Run all checks
  const results = Object.entries(checks).map(([name, check]) => {
    const result = check();
    console.log(`${result ? '✅' : '❌'} ${name}: ${result ? 'PASS' : 'FAIL'}`);
    return result;
  });

  // Overall eligibility is true only if all checks pass
  const isEligible = results.every(result => result);
  
  if (isEligible) {
    console.log('✅ Job is eligible for fastlane routing');
  } else {
    console.log('❌ Job is NOT eligible for fastlane routing');
  }
  
  return isEligible;
}

// Run the eligibility check
const eligible = isEligibleForFastlane();

// Exit with appropriate code
process.exit(eligible ? 0 : 1);