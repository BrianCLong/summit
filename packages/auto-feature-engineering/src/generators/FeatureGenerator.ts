import { Feature, FeatureEngineeringConfig } from '../index';

export class FeatureGenerator {
  async generate(features: Feature[], config: FeatureEngineeringConfig): Promise<Feature[]> {
    const generated: Feature[] = [];

    if (config.polynomialDegree) {
      generated.push(...this.generatePolynomial(features, config.polynomialDegree));
    }

    if (config.interactions) {
      generated.push(...this.generateInteractions(features));
    }

    if (config.statistical) {
      generated.push(...this.generateStatistical(features));
    }

    return generated.slice(0, config.maxFeatures);
  }

  private generatePolynomial(features: Feature[], degree: number): Feature[] {
    const numeric = features.filter(f => f.type === 'numeric');
    const generated: Feature[] = [];

    for (const feature of numeric) {
      for (let d = 2; d <= degree; d++) {
        generated.push({
          name: `${feature.name}_pow${d}`,
          type: 'numeric',
          metadata: { source: feature.name, transformation: `power_${d}` },
        });
      }
    }

    return generated;
  }

  private generateInteractions(features: Feature[]): Feature[] {
    const numeric = features.filter(f => f.type === 'numeric');
    const generated: Feature[] = [];

    for (let i = 0; i < numeric.length; i++) {
      for (let j = i + 1; j < numeric.length; j++) {
        generated.push({
          name: `${numeric[i].name}_x_${numeric[j].name}`,
          type: 'numeric',
          metadata: { sources: [numeric[i].name, numeric[j].name], transformation: 'multiply' },
        });
      }
    }

    return generated;
  }

  private generateStatistical(features: Feature[]): Feature[] {
    const numeric = features.filter(f => f.type === 'numeric');
    const generated: Feature[] = [];

    for (const feature of numeric) {
      generated.push(
        { name: `${feature.name}_log`, type: 'numeric', metadata: { source: feature.name, transformation: 'log' } },
        { name: `${feature.name}_sqrt`, type: 'numeric', metadata: { source: feature.name, transformation: 'sqrt' } },
        { name: `${feature.name}_zscore`, type: 'numeric', metadata: { source: feature.name, transformation: 'zscore' } }
      );
    }

    return generated;
  }
}
