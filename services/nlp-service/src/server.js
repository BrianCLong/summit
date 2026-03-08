"use strict";
/**
 * NLP Service - REST API
 *
 * Production-ready NLP API with comprehensive text analytics
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const nlp_1 = require("./routes/nlp");
const entities_1 = require("./routes/entities");
const sentiment_1 = require("./routes/sentiment");
const topics_1 = require("./routes/topics");
const summarization_1 = require("./routes/summarization");
const error_handler_1 = require("./middleware/error-handler");
const logger_1 = require("./middleware/logger");
const app = (0, express_1.default)();
const PORT = process.env.NLP_SERVICE_PORT || 3010;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(logger_1.logger);
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'nlp-service', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/nlp', (0, nlp_1.createNLPRouter)());
app.use('/api/entities', (0, entities_1.createEntityRouter)());
app.use('/api/sentiment', (0, sentiment_1.createSentimentRouter)());
app.use('/api/topics', (0, topics_1.createTopicRouter)());
app.use('/api/summarization', (0, summarization_1.createSummaryRouter)());
// Error handling
app.use(error_handler_1.errorHandler);
// Start server
app.listen(PORT, () => {
    console.log(`🚀 NLP Service running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
});
exports.default = app;
