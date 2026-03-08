"use strict";
/**
 * Catalog Service API Server
 * REST API for data catalog operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const catalogRoutes_js_1 = require("./routes/catalogRoutes.js");
const glossaryRoutes_js_1 = require("./routes/glossaryRoutes.js");
const searchRoutes_js_1 = require("./routes/searchRoutes.js");
const analyticsRoutes_js_1 = require("./routes/analyticsRoutes.js");
const lineageRoutes_js_1 = require("./routes/lineageRoutes.js");
const dataSourceRoutes_js_1 = require("./routes/dataSourceRoutes.js");
const schemaRoutes_js_1 = require("./routes/schemaRoutes.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const app = (0, express_1.default)();
const PORT = process.env.CATALOG_SERVICE_PORT || 3100;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'catalog-service' });
});
// API Routes
app.use('/api/v1/catalog', catalogRoutes_js_1.catalogRouter);
app.use('/api/v1/catalog', dataSourceRoutes_js_1.dataSourceRouter); // Data sources, datasets, fields
app.use('/api/v1/catalog/schemas', schemaRoutes_js_1.schemaRouter); // Schema registry
app.use('/api/v1/glossary', glossaryRoutes_js_1.glossaryRouter);
app.use('/api/v1/search', searchRoutes_js_1.searchRouter);
app.use('/api/v1/analytics', analyticsRoutes_js_1.analyticsRouter);
app.use('/api/v1/lineage', lineageRoutes_js_1.lineageRouter);
// Error handling
app.use(errorHandler_js_1.errorHandler);
// Start server
app.listen(PORT, () => {
    console.log(`Catalog Service listening on port ${PORT}`);
});
exports.default = app;
