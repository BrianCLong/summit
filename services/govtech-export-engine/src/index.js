"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const market_analyzer_js_1 = require("./analyzers/market-analyzer.js");
const estonia_catalog_js_1 = require("./analyzers/estonia-catalog.js");
const branding_engine_js_1 = require("./branding/branding-engine.js");
const package_generator_js_1 = require("./exporters/package-generator.js");
const types_js_1 = require("./models/types.js");
const app = (0, express_1.default)();
exports.app = app;
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
const marketAnalyzer = new market_analyzer_js_1.MarketAnalyzer();
const brandingEngine = new branding_engine_js_1.BrandingEngine();
const packageGenerator = new package_generator_js_1.PackageGenerator();
// Store generated packages in memory (use DB in production)
const packages = new Map();
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
        services: estonia_catalog_js_1.EstoniaDigitalCatalog.map(s => ({
            id: s.id,
            name: s.name,
            category: s.category,
            description: s.description,
            version: s.version,
            maturityLevel: s.maturityLevel,
        })),
        categories: types_js_1.ServiceCategorySchema.options,
    });
});
/**
 * GET /api/catalog/:category
 * Get services by category
 */
app.get('/api/catalog/:category', (req, res) => {
    const category = req.params.category;
    const result = types_js_1.ServiceCategorySchema.safeParse(category);
    if (!result.success) {
        return res.status(400).json({ error: 'Invalid category', valid: types_js_1.ServiceCategorySchema.options });
    }
    const services = (0, estonia_catalog_js_1.getServicesByCategory)(result.data);
    res.json({ category: result.data, services });
});
/**
 * POST /api/analyze
 * Analyze a target country for GovTech export readiness
 */
app.post('/api/analyze', (req, res) => {
    const result = types_js_1.CountryProfileSchema.safeParse(req.body);
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
    const countryResult = types_js_1.CountryProfileSchema.safeParse(country);
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
    }
    catch (error) {
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
        const zipBuffer = await packageGenerator.exportAsZip(pkg);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="govtech-package-${req.params.id}.zip"`);
        res.send(zipBuffer);
    }
    catch (error) {
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
            digitalLiteracy: 'medium',
            existingEgov: [],
        },
        regulatory: {
            eSignatureLaw: false,
            cloudPolicy: 'flexible',
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
app.use((err, _req, res, _next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});
const PORT = process.env.PORT || 3050;
app.listen(PORT, () => {
    console.log(`GovTech Export Engine running on port ${PORT}`);
    console.log(`Catalog: ${estonia_catalog_js_1.EstoniaDigitalCatalog.length} Estonian digital services available`);
});
