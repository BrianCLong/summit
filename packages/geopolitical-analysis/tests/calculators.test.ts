/**
 * Tests for indicator calculators
 */

import {
  PoliticalStabilityCalculator,
  FoodSecurityCalculator,
  SupplyChainCalculator,
} from '../src';
import { RiskLevel } from '../src/types';

describe('PoliticalStabilityCalculator', () => {
  const calculator = new PoliticalStabilityCalculator();

  it('should calculate high stability for strong indicators', () => {
    const result = calculator.calculate({
      countryCode: 'NO',
      countryName: 'Norway',
      eliteCohesion: 90,
      governmentEffectiveness: 95,
      politicalViolenceRisk: 5,
      institutionalStrength: 95,
      protestActivity: 10,
      electionRisk: 5,
    });

    expect(result.type).toBe('POLITICAL_STABILITY');
    expect(result.riskLevel).toBe(RiskLevel.LOW);
    expect(result.score).toBeGreaterThan(75);
    expect(result.countryCode).toBe('NO');
  });

  it('should calculate low stability for weak indicators', () => {
    const result = calculator.calculate({
      countryCode: 'XX',
      countryName: 'Test Country',
      eliteCohesion: 20,
      governmentEffectiveness: 15,
      politicalViolenceRisk: 85,
      institutionalStrength: 25,
      protestActivity: 80,
      electionRisk: 70,
    });

    expect(result.riskLevel).toBe(RiskLevel.CRITICAL);
    expect(result.score).toBeLessThan(30);
  });

  it('should throw error for invalid inputs', () => {
    expect(() =>
      calculator.calculate({
        countryCode: 'XX',
        countryName: 'Test',
        eliteCohesion: 150, // Invalid
        governmentEffectiveness: 50,
        politicalViolenceRisk: 50,
        institutionalStrength: 50,
        protestActivity: 50,
        electionRisk: 50,
      })
    ).toThrow();
  });

  it('should throw error for missing country code', () => {
    expect(() =>
      calculator.calculate({
        countryCode: '',
        countryName: 'Test',
        eliteCohesion: 50,
        governmentEffectiveness: 50,
        politicalViolenceRisk: 50,
        institutionalStrength: 50,
        protestActivity: 50,
        electionRisk: 50,
      })
    ).toThrow();
  });
});

describe('FoodSecurityCalculator', () => {
  const calculator = new FoodSecurityCalculator();

  it('should calculate low risk for secure food situation', () => {
    const result = calculator.calculate({
      countryCode: 'US',
      countryName: 'United States',
      grainReservesDays: 180,
      foodPriceInflation: 2.5,
      importDependence: 10,
      agriculturalProduction: 110,
      supplyChainDisruption: 5,
    });

    expect(result.type).toBe('FOOD_SECURITY');
    expect(result.riskLevel).toBe(RiskLevel.LOW);
    expect(result.socialUnrestRisk).toBeLessThan(30);
  });

  it('should calculate high risk for insecure food situation', () => {
    const result = calculator.calculate({
      countryCode: 'XX',
      countryName: 'Test Country',
      grainReservesDays: 20,
      foodPriceInflation: 35,
      importDependence: 85,
      agriculturalProduction: 60,
      supplyChainDisruption: 80,
    });

    expect(result.riskLevel).toBeOneOf([RiskLevel.HIGH, RiskLevel.CRITICAL]);
    expect(result.socialUnrestRisk).toBeGreaterThan(60);
  });

  it('should throw error for negative grain reserves', () => {
    expect(() =>
      calculator.calculate({
        countryCode: 'XX',
        countryName: 'Test',
        grainReservesDays: -10,
        foodPriceInflation: 5,
        importDependence: 50,
        agriculturalProduction: 100,
        supplyChainDisruption: 20,
      })
    ).toThrow();
  });
});

describe('SupplyChainCalculator', () => {
  const calculator = new SupplyChainCalculator();

  it('should calculate low vulnerability for diversified supply', () => {
    const result = calculator.calculate({
      countryCode: 'US',
      countryName: 'United States',
      resourceType: 'copper',
      supplyConcentration: 30,
      alternativeSourcesAvailable: 80,
      transportationRisk: 20,
      geopoliticalDependency: 15,
      stockpileDays: 200,
    });

    expect(result.type).toBe('SUPPLY_CHAIN');
    expect(result.resourceType).toBe('copper');
    expect(result.riskLevel).toBeOneOf([RiskLevel.LOW, RiskLevel.MODERATE]);
  });

  it('should calculate high vulnerability for concentrated supply', () => {
    const result = calculator.calculate({
      countryCode: 'XX',
      countryName: 'Test Country',
      resourceType: 'rare-earths',
      supplyConcentration: 95,
      alternativeSourcesAvailable: 5,
      transportationRisk: 80,
      geopoliticalDependency: 90,
      stockpileDays: 15,
    });

    expect(result.riskLevel).toBeOneOf([RiskLevel.HIGH, RiskLevel.CRITICAL]);
  });

  it('should throw error for missing resource type', () => {
    expect(() =>
      calculator.calculate({
        countryCode: 'XX',
        countryName: 'Test',
        resourceType: '',
        supplyConcentration: 50,
        alternativeSourcesAvailable: 50,
        transportationRisk: 50,
        geopoliticalDependency: 50,
        stockpileDays: 90,
      })
    ).toThrow();
  });
});

// Custom Jest matcher
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of ${expected.join(', ')}`
          : `expected ${received} to be one of ${expected.join(', ')}`,
    };
  },
});
