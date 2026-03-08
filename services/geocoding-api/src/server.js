"use strict";
/**
 * Geocoding API Server
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const geocoding_js_1 = __importDefault(require("./routes/geocoding.js"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3003;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
    message: 'Too many requests from this IP, please try again later',
});
app.use('/api/', limiter);
// Body parsing middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use('/api/geocoding', geocoding_js_1.default);
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'IntelGraph Geocoding API',
        version: '1.0.0',
        endpoints: {
            geocode: 'GET /api/geocoding/geocode?address=<address>',
            reverse: 'GET /api/geocoding/reverse?lat=<lat>&lon=<lon>',
            batch: 'POST /api/geocoding/batch',
            ipLookup: 'GET /api/geocoding/ip/:ip',
            ipBatch: 'POST /api/geocoding/ip/batch',
            health: 'GET /api/geocoding/health',
        },
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
    });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🌍 Geocoding API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Provider: ${process.env.GEOCODING_PROVIDER || 'nominatim'}`);
});
exports.default = app;
