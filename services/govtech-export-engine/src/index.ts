import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { v4 as uuid } from 'uuid';
import { MarketAnalyzer } from './analyzers/market-analyzer.js';
import { EstoniaDigitalCatalog, getServicesByCategory } from './analyzers/estonia-catalog.js';
import { BrandingEngine } from './branding/branding-engine.js';
import { PackageGenerator } from './exporters/package-generator.js';
import { CountryProfileSchema, ServiceCategorySchema } from './models/types.js';

const app: express.Application = express();
app.use(helmet());
app.use(express.json());

const marketAnalyzer = new MarketAnalyzer();
const brandingEngine = new BrandingEngine();
const packageGenerator = new PackageGenerator();

// Store generated packages in memory (use DB in production)
const packages = new Map<string, object>();

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'govtech-export-engine' });
});

/**
 * GET /api/catalog
 * List all available Estonian digital services for export
 */
app.get('/api/catalog', (_req, res) => {
  res.json({
    services: EstoniaDigitalCatalog.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      version: s.version,
      maturityLevel: s.maturityLevel,
    })),
    categories: ServiceCategorySchema.options,
  });
});

/**
 * GET /api/catalog/:category
 * Get services by category
 */
app.get('/api/catalog/:category', (req, res) => {
  const category = req.params.category;
  const result = ServiceCategorySchema.safeParse(category);

  if (!result.success) {
    return res.status(400).json({ error: 'Invalid category', valid: ServiceCategorySchema.options });
  }

  const services = getServicesByCategory(result.data);
  res.json({ category: result.data, services });
});

/**
 * POST /api/analyze
 * Analyze a target country for GovTech export readiness
 */
app.post('/api/analyze', (req, res) => {
  const result = CountryProfileSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ error: 'Invalid country profile', details: result.error.issues });
  }

  const analysis = marketAnalyzer.analyzeMarket(result.data);
  const branding = brandingEngine.generateBranding(result.data);

  res.json({
    analysis,
    suggestedBranding: branding,
  });
});

/**
 * POST /api/generate-package
 * Generate a complete export package for a target country
 */
app.post('/api/generate-package', async (req, res) => {
  const { country, categories } = req.body;

  const countryResult = CountryProfileSchema.safeParse(country);
  if (!countryResult.success) {
    return res.status(400).json({ error: 'Invalid country profile', details: countryResult.error.issues });
  }

  try {
    const pkg = await packageGenerator.generatePackage(countryResult.data, categories);
    packages.set(pkg.id, pkg);

    res.json({
      id: pkg.id,
      name: pkg.name,
      totalCost: pkg.totalCost,
      totalDuration: pkg.totalDuration,
      servicesCount: pkg.services.length,
      services: pkg.services.map(s => ({
        name: s.service.name,
        category: s.service.category,
        cost: s.estimatedCost,
        duration: s.implementationMonths,
        adaptations: s.adaptations.length,
      })),
      branding: pkg.branding,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate package' });
  }
});

/**
 * GET /api/packages/:id/download
 * Download an export package as a ZIP file
 */
app.get('/api/packages/:id/download', async (req, res) => {
  const pkg = packages.get(req.params.id);

  if (!pkg) {
    return res.status(404).json({ error: 'Package not found' });
  }

  try {
    const zipBuffer = await packageGenerator.exportAsZip(pkg as any);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="govtech-package-${req.params.id}.zip"`);
    res.send(zipBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate ZIP' });
  }
});

/**
 * GET /api/branding/preview/:countryCode
 * Preview branding for a country (quick check)
 */
app.get('/api/branding/preview/:countryCode', (req, res) => {
  const { countryCode } = req.params;

  // Simple preview with minimal country data
  const mockCountry = {
    code: countryCode.toUpperCase(),
    name: countryCode.toUpperCase(),
    region: 'Unknown',
    population: 1_000_000,
    infrastructure: {
      internetPenetration: 70,
      mobileSubscriptions: 1_000_000,
      digitalLiteracy: 'medium' as const,
      existingEgov: [],
    },
    regulatory: {
      eSignatureLaw: false,
      cloudPolicy: 'flexible' as const,
      gdprCompliant: false,
    },
    localization: {
      officialLanguages: ['en'],
      currencyCode: 'USD',
      dateFormat: 'YYYY-MM-DD',
      timezone: 'UTC',
    },
    priorities: [],
  };

  const branding = brandingEngine.generateBranding(mockCountry);
  const css = brandingEngine.generateThemeCSS(branding);

  res.json({ branding, css });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3050;

app.listen(PORT, () => {
  console.log(`GovTech Export Engine running on port ${PORT}`);
  console.log(`Catalog: ${EstoniaDigitalCatalog.length} Estonian digital services available`);
});

export { app };
