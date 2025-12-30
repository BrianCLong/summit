import {
  PalettePolicyContext,
  PaletteRequestOptions,
  PaletteRuntimeConfig,
  PaletteSelectionResult,
  PaletteSelectionStrategy,
  ReasoningPalette,
} from './types.js';
import { getPalette, listPalettes } from './registry.js';

interface PalettePolicyGate {
  assertAllowed(palette: ReasoningPalette, strategy: PaletteSelectionStrategy | undefined, ctx?: PalettePolicyContext): void;
}

class DefaultPalettePolicyGate implements PalettePolicyGate {
  constructor(private config: PaletteRuntimeConfig) {}

  assertAllowed(palette: ReasoningPalette, strategy: PaletteSelectionStrategy | undefined, ctx?: PalettePolicyContext): void {
    if (!this.config.enabled) {
      throw new Error('Reasoning palettes are disabled by policy');
    }

    if (this.config.allowedPaletteIds && !this.config.allowedPaletteIds.includes(palette.id)) {
      throw new Error(`Palette ${palette.id} is not allow-listed`);
    }

    if (ctx?.tenantId && this.config.tenantAllowList) {
      const allowed = this.config.tenantAllowList[ctx.tenantId];
      if (allowed && !allowed.includes(palette.id)) {
        throw new Error(`Palette ${palette.id} is not allowed for tenant ${ctx.tenantId}`);
      }
    }

    if (!this.config.allowExploration && strategy && (strategy.type === 'random' || strategy.type === 'schedule')) {
      throw new Error('Exploration strategies are disabled for this context');
    }

    if (ctx?.highCompliance && (strategy?.type === 'random' || strategy?.type === 'schedule')) {
      throw new Error('Exploration palettes are disabled in high-compliance contexts');
    }
  }
}

function createRng(seed = Date.now()) {
  let state = seed % 2147483647;
  if (state <= 0) {state += 2147483646;}
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

function pickWeighted<T>(items: T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    if (r < weights[i]) {return items[i];}
    r -= weights[i];
  }
  return items[items.length - 1];
}

export class PaletteSelector {
  private policyGate: PalettePolicyGate;

  constructor(private runtime: PaletteRuntimeConfig, policyGate?: PalettePolicyGate) {
    this.policyGate = policyGate || new DefaultPalettePolicyGate(runtime);
  }

  select(options: PaletteRequestOptions = {}, ctx?: PalettePolicyContext): PaletteSelectionResult {
    const strategy = options.overrideId
      ? ({ type: 'fixed', id: options.overrideId } satisfies PaletteSelectionStrategy)
      : options.strategy;

    const palette = this.resolvePalette(strategy, options.seed);
    this.policyGate.assertAllowed(palette.palette, strategy || undefined, ctx);
    return palette;
  }

  private resolvePalette(strategy?: PaletteSelectionStrategy, seed?: number): PaletteSelectionResult {
    if (strategy?.type === 'fixed') {
      const palette = getPalette(strategy.id);
      if (!palette) {throw new Error(`Palette ${strategy.id} not found`);}
      return { palette, strategyUsed: strategy, injectionKind: palette.injection.kind, decodingApplied: palette.decoding };
    }

    if (strategy?.type === 'random') {
      const palette = this.randomPalette(strategy.allowedIds, strategy.weights, strategy.seed ?? seed);
      return { palette, strategyUsed: strategy, injectionKind: palette.injection.kind, decodingApplied: palette.decoding };
    }

    if (strategy?.type === 'schedule') {
      const shouldExplore = this.scheduleExplore(strategy, seed);
      if (!shouldExplore) {
        const fallback = this.getDefaultPalette();
        return { palette: fallback, strategyUsed: strategy, injectionKind: fallback.injection.kind, decodingApplied: fallback.decoding };
      }
      const palette = this.randomPalette(undefined, undefined, strategy.seed ?? seed);
      return { palette, strategyUsed: strategy, injectionKind: palette.injection.kind, decodingApplied: palette.decoding };
    }

    if (strategy?.type === 'policy') {
      const palette = this.getDefaultPalette();
      return { palette, strategyUsed: strategy, injectionKind: palette.injection.kind, decodingApplied: palette.decoding };
    }

    const palette = this.getDefaultPalette();
    return { palette, strategyUsed: null, injectionKind: palette.injection.kind, decodingApplied: palette.decoding };
  }

  private randomPalette(allowed?: string[], weights?: number[], seed?: number): ReasoningPalette {
    const rng = createRng(seed ?? Date.now());
    const candidates = allowed?.length ? listPalettes().filter((p) => allowed.includes(p.id)) : listPalettes();
    if (!candidates.length) {throw new Error('No palettes available for random selection');}
    if (weights && weights.length === candidates.length) {
      return pickWeighted(candidates, weights, rng);
    }
    const index = Math.floor(rng() * candidates.length);
    return candidates[index];
  }

  private scheduleExplore(strategy: Exclude<PaletteSelectionStrategy, { type: 'fixed' | 'random' | 'policy' }>, seed?: number): boolean {
    const rng = createRng(seed ?? Date.now());
    if (strategy.mode === 'linear_decay') {
      const p = Math.max(0, strategy.pExploration) * Math.max(0, Math.min(1, 1 - 1 / Math.max(1, strategy.steps)));
      return rng() < p;
    }
    // two_phase
    const phaseBoundary = Math.max(1, Math.floor(strategy.steps / 2));
    const exploreProb = strategy.phase1Exploration ?? strategy.pExploration;
    return rng() < exploreProb / phaseBoundary;
  }

  private getDefaultPalette(): ReasoningPalette {
    const defaultPalette = getPalette(this.runtime.defaultPaletteId);
    if (!defaultPalette) {
      const available = listPalettes();
      if (!available.length) {throw new Error('No palettes registered');}
      return available[0];
    }
    return defaultPalette;
  }
}
