import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ContextBudgetConfig {
  maxConfiguredTools: number;
  maxEnabledTools: number;
  maxActiveTools: number;
}

export const DEFAULT_BUDGET: ContextBudgetConfig = {
  maxConfiguredTools: 30,
  maxEnabledTools: 10,
  maxActiveTools: 80,
};

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Loads the context budget configuration from a file or returns default.
 */
export function loadBudgetConfig(configPath?: string): ContextBudgetConfig {
  if (configPath && fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(content);
      return { ...DEFAULT_BUDGET, ...config };
    } catch (e) {
      console.warn(`Failed to load budget config from ${configPath}, using defaults.`);
    }
  }
  return DEFAULT_BUDGET;
}

/**
 * Validates the tool usage against the context budget.
 */
export function validateBudget(
  stats: { configured: number; enabled: number; active: number },
  config: ContextBudgetConfig = DEFAULT_BUDGET
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Configured tools check (Soft warning)
  if (stats.configured > config.maxConfiguredTools) {
    warnings.push(
      `Configured tools (${stats.configured}) exceeds suggested limit of ${config.maxConfiguredTools}. This may shrink usable context.`
    );
  } else if (stats.configured >= 20) {
    warnings.push(
      `Configured tools (${stats.configured}) is approaching the limit of ${config.maxConfiguredTools}.`
    );
  }

  // Enabled tools check (Hard cap)
  if (stats.enabled > config.maxEnabledTools) {
    errors.push(
      `Enabled tools (${stats.enabled}) exceeds the hard cap of ${config.maxEnabledTools}.`
    );
  }

  // Active tools check (Maximum limit)
  if (stats.active > config.maxActiveTools) {
    errors.push(
      `Active tools (${stats.active}) exceeds the maximum active tool limit of ${config.maxActiveTools}.`
    );
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}
