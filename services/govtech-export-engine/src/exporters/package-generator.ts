import { v4 as uuid } from 'uuid';
import JSZip from 'jszip';
import type {
  CountryProfile,
  DigitalService,
  ExportPackage,
  ServiceCategory,
} from '../models/types.js';
import { EstoniaDigitalCatalog, calculateImplementationOrder } from '../analyzers/estonia-catalog.js';
import { MarketAnalyzer } from '../analyzers/market-analyzer.js';
import { BrandingEngine, type BrandingConfig } from '../branding/branding-engine.js';

/**
 * Export Package Generator - Creates turnkey GovTech solution packages
 */
export class PackageGenerator {
  private marketAnalyzer = new MarketAnalyzer();
  private brandingEngine = new BrandingEngine();

  /**
   * Generate a complete export package for a target country
   */
  async generatePackage(
    country: CountryProfile,
    requestedCategories?: ServiceCategory[]
  ): Promise<ExportPackage> {
    // Analyze the market
    const analysis = this.marketAnalyzer.analyzeMarket(country);

    // Determine which services to include
    const categories = requestedCategories || analysis.recommendedServices;
    const selectedServices = this.selectServices(categories);

    // Calculate implementation order
    const orderedNames = calculateImplementationOrder(selectedServices.map(s => s.name));
    const orderedServices = orderedNames
      .map(name => selectedServices.find(s => s.name === name))
      .filter((s): s is DigitalService => s !== undefined);

    // Generate branding
    const branding = this.brandingEngine.generateBranding(country);

    // Generate adaptations
    const adaptations = this.marketAnalyzer.generateAdaptations(
      orderedServices.map(s => s.name),
      country
    );

    // Calculate costs and timelines
    const serviceDetails = orderedServices.map(service => {
      const serviceAdaptations = adaptations
        .filter(a => a.serviceId === service.id)
        .map(a => a.description);

      const baseCost = this.calculateBaseCost(service, country);
      const adaptationCost = adaptations
        .filter(a => a.serviceId === service.id)
        .reduce((sum, a) => sum + a.estimatedEffort * 800, 0); // $800/day

      return {
        service,
        adaptations: serviceAdaptations,
        estimatedCost: baseCost + adaptationCost,
        implementationMonths: this.estimateImplementationTime(service, country),
      };
    });

    const totalCost = serviceDetails.reduce((sum, s) => sum + s.estimatedCost, 0);
    const totalDuration = this.calculateTotalDuration(serviceDetails);

    return {
      id: uuid(),
      name: `${country.name} Digital Government Package`,
      targetCountry: country,
      services: serviceDetails,
      branding: {
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        countryPrefix: branding.prefix,
      },
      totalCost,
      totalDuration,
      createdAt: new Date(),
      status: 'draft',
    };
  }

  /**
   * Export package as a ZIP bundle with all artifacts
   */
  async exportAsZip(pkg: ExportPackage): Promise<Buffer> {
    const zip = new JSZip();
    const branding = this.brandingEngine.generateBranding(pkg.targetCountry);

    // Package manifest
    zip.file('manifest.json', JSON.stringify({
      id: pkg.id,
      name: pkg.name,
      country: pkg.targetCountry.code,
      services: pkg.services.map(s => s.service.name),
      totalCost: pkg.totalCost,
      totalDuration: pkg.totalDuration,
      generatedAt: new Date().toISOString(),
    }, null, 2));

    // Executive summary
    zip.file('EXECUTIVE_SUMMARY.md', this.generateExecutiveSummary(pkg));

    // Technical specifications
    const techFolder = zip.folder('technical');
    for (const serviceDetail of pkg.services) {
      techFolder?.file(
        `${this.slugify(serviceDetail.service.name)}.md`,
        this.generateTechSpec(serviceDetail.service, pkg.targetCountry)
      );
    }

    // Branding assets
    const brandingFolder = zip.folder('branding');
    brandingFolder?.file('theme.css', this.brandingEngine.generateThemeCSS(branding));
    brandingFolder?.file('config.json', JSON.stringify(
      this.brandingEngine.generateLocalizationConfig(pkg.targetCountry),
      null,
      2
    ));

    // Service naming map
    const nameMap = this.brandingEngine.generateServiceNames(
      pkg.services.map(s => s.service.name),
      branding
    );
    brandingFolder?.file('service-names.json', JSON.stringify(
      Object.fromEntries(nameMap),
      null,
      2
    ));

    // Implementation roadmap
    zip.file('ROADMAP.md', this.generateRoadmap(pkg));

    // Cost breakdown
    zip.file('COST_BREAKDOWN.md', this.generateCostBreakdown(pkg));

    return zip.generateAsync({ type: 'nodebuffer' }) as Promise<Buffer>;
  }

  private selectServices(categories: ServiceCategory[]): DigitalService[] {
    const services: DigitalService[] = [];

    // Always include X-Road (foundational)
    const xroad = EstoniaDigitalCatalog.find(s => s.name === 'X-Road');
    if (xroad) services.push(xroad);

    // Always include identity
    const identity = EstoniaDigitalCatalog.find(s => s.category === 'identity');
    if (identity && !services.includes(identity)) services.push(identity);

    // Add services for requested categories
    for (const category of categories) {
      const categoryServices = EstoniaDigitalCatalog.filter(
        s => s.category === category && !services.includes(s)
      );
      services.push(...categoryServices);
    }

    return services;
  }

  private calculateBaseCost(service: DigitalService, country: CountryProfile): number {
    // Base cost factors
    const categoryBaseCosts: Record<string, number> = {
      governance: 2_000_000,
      identity: 5_000_000,
      voting: 3_000_000,
      taxation: 4_000_000,
      healthcare: 6_000_000,
      education: 2_500_000,
      business: 2_000_000,
      residency: 1_500_000,
      land_registry: 2_500_000,
      cybersecurity: 3_000_000,
    };

    const baseCost = categoryBaseCosts[service.category] || 2_000_000;

    // Scale by population
    let populationMultiplier = 1;
    if (country.population > 100_000_000) populationMultiplier = 3;
    else if (country.population > 50_000_000) populationMultiplier = 2;
    else if (country.population > 10_000_000) populationMultiplier = 1.5;

    // Scale by infrastructure readiness (inverse - less ready = more cost)
    const infrastructureMultiplier =
      country.infrastructure.internetPenetration < 60 ? 1.5 :
      country.infrastructure.internetPenetration < 80 ? 1.2 : 1;

    return Math.round(baseCost * populationMultiplier * infrastructureMultiplier);
  }

  private estimateImplementationTime(
    service: DigitalService,
    country: CountryProfile
  ): number {
    const baseMonths: Record<string, number> = {
      governance: 12,
      identity: 18,
      voting: 24,
      taxation: 15,
      healthcare: 24,
      education: 12,
      business: 10,
      residency: 12,
      land_registry: 15,
      cybersecurity: 9,
    };

    let months = baseMonths[service.category] || 12;

    // Add time for infrastructure gaps
    if (country.infrastructure.internetPenetration < 60) months += 6;
    if (country.infrastructure.digitalLiteracy === 'low') months += 3;

    // Add time for legal framework
    if (!country.regulatory.eSignatureLaw) months += 6;

    return months;
  }

  private calculateTotalDuration(
    services: Array<{ implementationMonths: number }>
  ): number {
    // Assume some parallelization (not fully sequential)
    const totalSequential = services.reduce((sum, s) => sum + s.implementationMonths, 0);
    return Math.round(totalSequential * 0.6); // 40% overlap
  }

  private generateExecutiveSummary(pkg: ExportPackage): string {
    return `# ${pkg.name}

## Executive Summary

This package provides a comprehensive digital government transformation solution
for ${pkg.targetCountry.name}, based on Estonia's world-leading e-government infrastructure.

### Key Metrics

- **Total Investment**: $${(pkg.totalCost / 1_000_000).toFixed(1)}M
- **Implementation Timeline**: ${pkg.totalDuration} months
- **Services Included**: ${pkg.services.length}

### Services Overview

${pkg.services.map(s => `- **${s.service.name}**: ${s.service.description}`).join('\n')}

### Expected Outcomes

- Digital-first government services accessible 24/7
- Reduced bureaucracy and processing times
- Enhanced transparency and citizen trust
- Cost savings through automation and interoperability
- Foundation for future digital innovation

### Implementation Approach

This package follows Estonia's proven "X-Road first" approach, establishing
secure data exchange infrastructure before deploying citizen-facing services.

---

*Generated by GovTech Export Accelerator*
*Powered by Estonian Digital Excellence*
`;
  }

  private generateTechSpec(service: DigitalService, country: CountryProfile): string {
    return `# ${service.name} - Technical Specification

## Overview

${service.description}

**Category**: ${service.category}
**Version**: ${service.version}
**Maturity**: ${service.maturityLevel}

## Technology Stack

### Backend
${service.techStack.backend.map(t => `- ${t}`).join('\n')}

### Frontend
${service.techStack.frontend.map(t => `- ${t}`).join('\n')}

### Databases
${service.techStack.databases.map(t => `- ${t}`).join('\n')}

### Infrastructure
${service.techStack.infrastructure.map(t => `- ${t}`).join('\n')}

### Security
${service.techStack.security.map(t => `- ${t}`).join('\n')}

## Integrations Required

${service.integrations.map(i => `- **${i.name}** (${i.type}): ${i.protocol}`).join('\n')}

## Compliance Standards

${service.compliance.map(c => `- ${c}`).join('\n')}

## Dependencies

${service.dependencies.length > 0 ? service.dependencies.map(d => `- ${d}`).join('\n') : 'None (standalone service)'}

## Adaptation Notes for ${country.name}

- Configure for ${country.localization.currencyCode} currency
- Support ${country.localization.officialLanguages.join(', ')} language(s)
- Timezone: ${country.localization.timezone}
${country.regulatory.cloudPolicy === 'local_only' ? '- **CRITICAL**: Deploy on local infrastructure' : ''}
`;
  }

  private generateRoadmap(pkg: ExportPackage): string {
    let roadmap = `# Implementation Roadmap for ${pkg.targetCountry.name}

## Overview

Total Duration: ${pkg.totalDuration} months

## Phases

`;
    let currentMonth = 0;
    for (const service of pkg.services) {
      roadmap += `### Phase: ${service.service.name}

- **Start**: Month ${currentMonth + 1}
- **Duration**: ${service.implementationMonths} months
- **End**: Month ${currentMonth + service.implementationMonths}

**Key Adaptations**:
${service.adaptations.map(a => `- ${a}`).join('\n') || '- Standard deployment'}

---

`;
      currentMonth += Math.round(service.implementationMonths * 0.6);
    }

    return roadmap;
  }

  private generateCostBreakdown(pkg: ExportPackage): string {
    let breakdown = `# Cost Breakdown for ${pkg.targetCountry.name}

## Summary

**Total Investment**: $${pkg.totalCost.toLocaleString()}

## By Service

| Service | Cost | Duration |
|---------|------|----------|
`;
    for (const service of pkg.services) {
      breakdown += `| ${service.service.name} | $${service.estimatedCost.toLocaleString()} | ${service.implementationMonths} months |\n`;
    }

    breakdown += `
## Cost Categories

- **Software Licensing & Adaptation**: 40%
- **Implementation & Integration**: 35%
- **Training & Change Management**: 15%
- **Ongoing Support (Year 1)**: 10%

## Payment Schedule

- **Phase 1 (Contract)**: 20%
- **Phase 2 (Development)**: 30%
- **Phase 3 (Testing)**: 25%
- **Phase 4 (Go-Live)**: 15%
- **Phase 5 (Support)**: 10%
`;

    return breakdown;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
