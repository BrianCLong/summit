/**
 * AI-Powered Data Valuation Service
 * Estimates fair market value of data assets using multiple methodologies
 */

import { v4 as uuid } from 'uuid';
import {
  DataAsset,
  DataValuation,
  PricingModel,
} from '@intelgraph/data-monetization-types';
import { logger } from '../utils/logger.js';

// Valuation factors and weights
const VALUATION_FACTORS = {
  uniqueness: { weight: 0.20, description: 'How unique is this data?' },
  freshness: { weight: 0.15, description: 'How recent is the data?' },
  completeness: { weight: 0.15, description: 'Data completeness percentage' },
  accuracy: { weight: 0.15, description: 'Data accuracy and quality' },
  volume: { weight: 0.10, description: 'Size and scale of dataset' },
  demand: { weight: 0.15, description: 'Market demand indicators' },
  compliance: { weight: 0.10, description: 'Regulatory compliance readiness' },
};

// Category base multipliers (cents per record)
const CATEGORY_MULTIPLIERS: Record<string, number> = {
  STRUCTURED: 0.01,
  UNSTRUCTURED: 0.005,
  GEOSPATIAL: 0.05,
  TIMESERIES: 0.02,
  GRAPH: 0.03,
  MEDIA: 0.008,
  SENSOR: 0.015,
  TRANSACTION: 0.04,
  BEHAVIORAL: 0.06,
  DEMOGRAPHIC: 0.035,
};

// Quality level multipliers
const QUALITY_MULTIPLIERS: Record<string, number> = {
  RAW: 1.0,
  CLEANSED: 1.5,
  ENRICHED: 2.5,
  CURATED: 4.0,
  CERTIFIED: 6.0,
};

export class ValuationService {
  /**
   * Generate comprehensive valuation for a data asset
   */
  async valuateAsset(asset: DataAsset): Promise<DataValuation> {
    logger.info({ assetId: asset.id }, 'Starting asset valuation');

    const factors = this.calculateFactors(asset);
    const baseValue = this.calculateBaseValue(asset);
    const adjustedValue = this.applyFactorAdjustments(baseValue, factors);
    const confidence = this.calculateConfidence(factors);
    const recommendation = this.generateRecommendation(asset, adjustedValue, factors);

    const valuation: DataValuation = {
      id: uuid(),
      assetId: asset.id,
      estimatedValueCents: Math.round(adjustedValue),
      confidenceScore: confidence,
      methodology: 'AI_MODEL',
      factors,
      recommendation,
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    return valuation;
  }

  private calculateFactors(
    asset: DataAsset,
  ): Array<{
    name: string;
    weight: number;
    score: number;
    impact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  }> {
    const factors: Array<{
      name: string;
      weight: number;
      score: number;
      impact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    }> = [];

    // Uniqueness - based on category rarity
    const uniquenessScore = this.scoreUniqueness(asset);
    factors.push({
      name: 'uniqueness',
      weight: VALUATION_FACTORS.uniqueness.weight,
      score: uniquenessScore,
      impact: uniquenessScore > 0.6 ? 'POSITIVE' : uniquenessScore < 0.4 ? 'NEGATIVE' : 'NEUTRAL',
    });

    // Freshness - based on last update
    const freshnessScore = this.scoreFreshness(asset);
    factors.push({
      name: 'freshness',
      weight: VALUATION_FACTORS.freshness.weight,
      score: freshnessScore,
      impact: freshnessScore > 0.6 ? 'POSITIVE' : freshnessScore < 0.4 ? 'NEGATIVE' : 'NEUTRAL',
    });

    // Completeness
    const completenessScore = this.scoreCompleteness(asset);
    factors.push({
      name: 'completeness',
      weight: VALUATION_FACTORS.completeness.weight,
      score: completenessScore,
      impact: completenessScore > 0.6 ? 'POSITIVE' : completenessScore < 0.4 ? 'NEGATIVE' : 'NEUTRAL',
    });

    // Quality/Accuracy
    const qualityScore = this.scoreQuality(asset);
    factors.push({
      name: 'accuracy',
      weight: VALUATION_FACTORS.accuracy.weight,
      score: qualityScore,
      impact: qualityScore > 0.6 ? 'POSITIVE' : qualityScore < 0.4 ? 'NEGATIVE' : 'NEUTRAL',
    });

    // Volume
    const volumeScore = this.scoreVolume(asset);
    factors.push({
      name: 'volume',
      weight: VALUATION_FACTORS.volume.weight,
      score: volumeScore,
      impact: volumeScore > 0.6 ? 'POSITIVE' : volumeScore < 0.4 ? 'NEGATIVE' : 'NEUTRAL',
    });

    // Market demand (simulated)
    const demandScore = this.scoreDemand(asset);
    factors.push({
      name: 'demand',
      weight: VALUATION_FACTORS.demand.weight,
      score: demandScore,
      impact: demandScore > 0.6 ? 'POSITIVE' : demandScore < 0.4 ? 'NEGATIVE' : 'NEUTRAL',
    });

    // Compliance readiness
    const complianceScore = this.scoreCompliance(asset);
    factors.push({
      name: 'compliance',
      weight: VALUATION_FACTORS.compliance.weight,
      score: complianceScore,
      impact: complianceScore > 0.6 ? 'POSITIVE' : complianceScore < 0.4 ? 'NEGATIVE' : 'NEUTRAL',
    });

    return factors;
  }

  private scoreUniqueness(asset: DataAsset): number {
    const rareCategories = ['BEHAVIORAL', 'GEOSPATIAL', 'TRANSACTION'];
    if (rareCategories.includes(asset.category)) return 0.8;
    if (asset.category === 'DEMOGRAPHIC') return 0.6;
    return 0.5;
  }

  private scoreFreshness(asset: DataAsset): number {
    if (!asset.metadata.lastUpdated) return 0.3;
    const daysSinceUpdate = (Date.now() - new Date(asset.metadata.lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 1) return 1.0;
    if (daysSinceUpdate < 7) return 0.9;
    if (daysSinceUpdate < 30) return 0.7;
    if (daysSinceUpdate < 90) return 0.5;
    return 0.3;
  }

  private scoreCompleteness(asset: DataAsset): number {
    // Based on quality level as proxy
    const qualityScores: Record<string, number> = {
      RAW: 0.4,
      CLEANSED: 0.6,
      ENRICHED: 0.75,
      CURATED: 0.9,
      CERTIFIED: 1.0,
    };
    return qualityScores[asset.qualityLevel] || 0.5;
  }

  private scoreQuality(asset: DataAsset): number {
    return QUALITY_MULTIPLIERS[asset.qualityLevel] / 6.0; // Normalize to 0-1
  }

  private scoreVolume(asset: DataAsset): number {
    const records = asset.metadata.recordCount || 0;
    if (records > 10000000) return 1.0;
    if (records > 1000000) return 0.8;
    if (records > 100000) return 0.6;
    if (records > 10000) return 0.4;
    return 0.2;
  }

  private scoreDemand(asset: DataAsset): number {
    // Simulated market demand based on category
    const highDemand = ['BEHAVIORAL', 'TRANSACTION', 'DEMOGRAPHIC'];
    const mediumDemand = ['GEOSPATIAL', 'TIMESERIES', 'GRAPH'];
    if (highDemand.includes(asset.category)) return 0.85;
    if (mediumDemand.includes(asset.category)) return 0.65;
    return 0.45;
  }

  private scoreCompliance(asset: DataAsset): number {
    // Based on sensitivity - lower sensitivity = easier compliance
    const sensitivityScores: Record<string, number> = {
      PUBLIC: 1.0,
      INTERNAL: 0.8,
      CONFIDENTIAL: 0.6,
      RESTRICTED: 0.4,
      TOP_SECRET: 0.2,
    };
    return sensitivityScores[asset.sensitivityLevel] || 0.5;
  }

  private calculateBaseValue(asset: DataAsset): number {
    const categoryMultiplier = CATEGORY_MULTIPLIERS[asset.category] || 0.01;
    const qualityMultiplier = QUALITY_MULTIPLIERS[asset.qualityLevel] || 1.0;
    const records = asset.metadata.recordCount || 1000;

    return records * categoryMultiplier * qualityMultiplier * 100; // Convert to cents
  }

  private applyFactorAdjustments(
    baseValue: number,
    factors: Array<{ weight: number; score: number }>,
  ): number {
    const weightedScore = factors.reduce((sum, f) => sum + f.weight * f.score, 0);
    // Apply as multiplier ranging from 0.5x to 2x
    const multiplier = 0.5 + weightedScore * 1.5;
    return baseValue * multiplier;
  }

  private calculateConfidence(
    factors: Array<{ score: number }>,
  ): number {
    // Confidence based on factor consistency
    const scores = factors.map((f) => f.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
    // Higher variance = lower confidence
    return Math.max(0.5, 1 - Math.sqrt(variance));
  }

  private generateRecommendation(
    asset: DataAsset,
    valueCents: number,
    factors: Array<{ name: string; score: number; impact: string }>,
  ): {
    suggestedPriceCents: number;
    priceRangeLow: number;
    priceRangeHigh: number;
    pricingModel: PricingModel;
    rationale: string;
  } {
    // Price range: 80% to 120% of estimated value
    const low = Math.round(valueCents * 0.8);
    const high = Math.round(valueCents * 1.2);
    const suggested = Math.round(valueCents);

    // Recommend pricing model based on characteristics
    let pricingModel: PricingModel = 'ONE_TIME';
    if (asset.metadata.refreshFrequency) {
      pricingModel = 'SUBSCRIPTION';
    } else if ((asset.metadata.recordCount || 0) > 1000000) {
      pricingModel = 'TIERED';
    }

    const positiveFactors = factors.filter((f) => f.impact === 'POSITIVE').map((f) => f.name);
    const negativeFactors = factors.filter((f) => f.impact === 'NEGATIVE').map((f) => f.name);

    let rationale = `Valuation based on ${asset.category} category with ${asset.qualityLevel} quality level. `;
    if (positiveFactors.length > 0) {
      rationale += `Strengths include: ${positiveFactors.join(', ')}. `;
    }
    if (negativeFactors.length > 0) {
      rationale += `Areas for improvement: ${negativeFactors.join(', ')}. `;
    }
    rationale += `Recommended ${pricingModel.toLowerCase().replace('_', ' ')} pricing.`;

    return {
      suggestedPriceCents: suggested,
      priceRangeLow: low,
      priceRangeHigh: high,
      pricingModel,
      rationale,
    };
  }
}

export const valuationService = new ValuationService();
