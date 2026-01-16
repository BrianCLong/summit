import * as fs from 'fs';
import * as path from 'path';

// Types for configuration
interface BaselineConfig {
  industry: 'tech' | 'finance' | 'healthcare' | 'public_sector';
  tenancyModel: 'single' | 'multi' | 'hybrid';
  region: string;
  dataSensitivity: 'low' | 'high';
}

interface BaselineOutput {
  recommendedOverlay: string;
  policyToggles: Record<string, boolean>;
  loggingRetentionDays: number;
  checklist: string[];
}

function generateBaseline(config: BaselineConfig): BaselineOutput {
  // 1. Overlay Selection
  let overlay = 'baseline-secure';
  if (config.tenancyModel === 'single') {
    overlay = 'prod-secure'; // Default to prod hardening for single tenant
  } else if (config.tenancyModel === 'multi') {
    overlay = 'prod-secure'; // Multi-tenant also needs prod hardening
  }

  // 2. Policy Toggles
  const policies: Record<string, boolean> = {
    'enforce_tls': true,
    'audit_logging': true,
    'mfa_required': true,
    'public_access': false,
  };

  if (config.industry === 'finance' || config.industry === 'healthcare') {
    policies['data_encryption_at_rest'] = true;
    policies['detailed_audit_trail'] = true;
    policies['session_timeout_strict'] = true;
  }

  if (config.dataSensitivity === 'high') {
     policies['dlp_scanning'] = true;
  }

  // 3. Retention
  let retention = 30;
  if (config.industry === 'finance') retention = 2555; // 7 years
  if (config.industry === 'healthcare') retention = 2190; // 6 years

  // 4. Checklist
  const checklist = [
    'Deploy selected overlay',
    'Configure Identity Provider',
  ];

  if (config.industry === 'finance') checklist.push('Configure HSM for key management');
  if (config.industry === 'healthcare') checklist.push('Sign BAA');
  if (config.region.startsWith('eu')) checklist.push('Verify GDPR Compliance settings');

  return {
    recommendedOverlay: overlay,
    policyToggles: policies,
    loggingRetentionDays: retention,
    checklist
  };
}

// Main execution
const args = process.argv.slice(2);
// Simple mock argument parsing for demonstration
// Usage: ts-node generate_customer_baseline.ts finance single us-east-1 high
const [industry, tenancy, region, sensitivity] = args;

if (!industry) {
  console.log("Usage: ts-node generate_customer_baseline.ts <industry> <tenancy> <region> <sensitivity>");
  console.log("Example: ts-node generate_customer_baseline.ts finance single us-east-1 high");
  process.exit(0);
}

const config: BaselineConfig = {
  industry: industry as any,
  tenancyModel: tenancy as any,
  region: region || 'us-east-1',
  dataSensitivity: sensitivity as any || 'low'
};

const output = generateBaseline(config);

console.log(JSON.stringify(output, null, 2));
