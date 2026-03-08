"use strict";
/**
 * Synthesis Service - Unified API for synthetic data generation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const synthetic_data_1 = require("@intelgraph/synthetic-data");
const privacy_preserving_1 = require("@intelgraph/privacy-preserving");
const text_generation_1 = require("@intelgraph/text-generation");
const image_synthesis_1 = require("@intelgraph/image-synthesis");
const audio_synthesis_1 = require("@intelgraph/audio-synthesis");
const graph_synthesis_1 = require("@intelgraph/graph-synthesis");
const geospatial_synthesis_1 = require("@intelgraph/geospatial-synthesis");
const data_augmentation_1 = require("@intelgraph/data-augmentation");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json({ limit: '50mb' }));
app.use(body_parser_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'synthesis-service', version: '1.0.0' });
});
// API Documentation
app.get('/api/docs', (req, res) => {
    res.json({
        endpoints: {
            tabular: '/api/synthesize/tabular',
            timeseries: '/api/synthesize/timeseries',
            text: '/api/synthesize/text',
            image: '/api/synthesize/image',
            audio: '/api/synthesize/audio',
            graph: '/api/synthesize/graph',
            geospatial: '/api/synthesize/geospatial',
            privacy: '/api/privacy/*',
            augmentation: '/api/augment/*'
        }
    });
});
// Tabular Data Synthesis
app.post('/api/synthesize/tabular', async (req, res) => {
    try {
        const { data, config } = req.body;
        const synthesizer = new synthetic_data_1.TabularSynthesizer(config);
        await synthesizer.fit(data);
        const result = await synthesizer.generate(config.numSamples);
        res.json({
            success: true,
            data: result.syntheticData,
            quality: result.quality,
            privacyMetrics: result.privacyMetrics
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Time Series Synthesis
app.post('/api/synthesize/timeseries', async (req, res) => {
    try {
        const { config } = req.body;
        const synthesizer = new synthetic_data_1.TimeSeriesSynthesizer(config);
        const result = await synthesizer.generate();
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Text Generation
app.post('/api/synthesize/text', async (req, res) => {
    try {
        const { config, numSamples, prompt } = req.body;
        const synthesizer = new text_generation_1.TextSynthesizer(config);
        const samples = await synthesizer.generate(numSamples, prompt);
        res.json({
            success: true,
            samples
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Named Entity Generation
app.post('/api/synthesize/entities', async (req, res) => {
    try {
        const { type, count } = req.body;
        const generator = new text_generation_1.NamedEntityGenerator();
        const entities = [];
        for (let i = 0; i < count; i++) {
            switch (type) {
                case 'person':
                    entities.push({ type, value: generator.generatePerson() });
                    break;
                case 'organization':
                    entities.push({ type, value: generator.generateOrganization() });
                    break;
                case 'location':
                    entities.push({ type, value: generator.generateLocation() });
                    break;
                default:
                    entities.push({ type, value: generator.generatePerson() });
            }
        }
        res.json({ success: true, entities });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Image Synthesis
app.post('/api/synthesize/image', async (req, res) => {
    try {
        const { config, numImages } = req.body;
        const synthesizer = new image_synthesis_1.ImageSynthesizer(config);
        const images = await synthesizer.generate(numImages);
        // Convert to base64 for transmission
        const imagesB64 = images.map(img => ({
            width: img.width,
            height: img.height,
            data: Buffer.from(img.data).toString('base64'),
            metadata: img.metadata
        }));
        res.json({
            success: true,
            images: imagesB64
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Audio Synthesis
app.post('/api/synthesize/audio', async (req, res) => {
    try {
        const { text, voice } = req.body;
        const synthesizer = new audio_synthesis_1.TTSSynthesizer();
        const audio = await synthesizer.synthesize(text, voice);
        res.json({
            success: true,
            audio: {
                sampleRate: audio.sampleRate,
                channels: audio.channels,
                duration: audio.duration,
                samples: Array.from(audio.samples)
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Graph Synthesis
app.post('/api/synthesize/graph', async (req, res) => {
    try {
        const { config } = req.body;
        const synthesizer = new graph_synthesis_1.GraphSynthesizer(config);
        const graph = await synthesizer.generate();
        res.json({
            success: true,
            graph
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Geospatial Synthesis
app.post('/api/synthesize/geospatial', async (req, res) => {
    try {
        const { config, numTraces, pointsPerTrace } = req.body;
        const synthesizer = new geospatial_synthesis_1.GeospatialSynthesizer(config);
        const traces = synthesizer.generateTraces(numTraces, pointsPerTrace);
        res.json({
            success: true,
            traces
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Privacy - Differential Privacy
app.post('/api/privacy/differential', async (req, res) => {
    try {
        const { config, value, sensitivity } = req.body;
        const dp = new privacy_preserving_1.DifferentialPrivacy(config);
        const privatized = dp.privatizeQuery(value, sensitivity);
        const budget = dp.getBudgetStatus();
        res.json({
            success: true,
            privatized,
            budget
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Privacy - K-Anonymity
app.post('/api/privacy/k-anonymity', async (req, res) => {
    try {
        const { data, config } = req.body;
        const kAnon = new privacy_preserving_1.KAnonymity(config);
        const result = kAnon.anonymize(data);
        res.json({
            success: true,
            anonymizedData: result.anonymizedData,
            metrics: result.metrics,
            warnings: result.warnings
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Privacy Assessment
app.post('/api/privacy/assess', async (req, res) => {
    try {
        const { original, synthetic, config } = req.body;
        const assessment = privacy_preserving_1.PrivacyValidator.assessPrivacy(original, synthetic, config);
        res.json({
            success: true,
            assessment
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Data Augmentation - Tabular
app.post('/api/augment/tabular', async (req, res) => {
    try {
        const { data, factor } = req.body;
        const augmentor = new data_augmentation_1.DataAugmentor();
        const augmented = augmentor.augmentTabular(data, factor);
        res.json({
            success: true,
            augmented
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Data Augmentation - Balance Classes
app.post('/api/augment/balance', async (req, res) => {
    try {
        const { data, targetColumn } = req.body;
        const augmentor = new data_augmentation_1.DataAugmentor();
        const balanced = augmentor.balanceClasses(data, targetColumn);
        res.json({
            success: true,
            balanced
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Batch Synthesis
app.post('/api/batch/synthesize', async (req, res) => {
    try {
        const { jobs } = req.body;
        const results = await Promise.all(jobs.map(async (job) => {
            try {
                // Process each job based on type
                switch (job.type) {
                    case 'tabular':
                        const tabSyn = new synthetic_data_1.TabularSynthesizer(job.config);
                        await tabSyn.fit(job.data);
                        return await tabSyn.generate(job.config.numSamples);
                    case 'text':
                        const textSyn = new text_generation_1.TextSynthesizer(job.config);
                        return await textSyn.generate(job.numSamples, job.prompt);
                    default:
                        throw new Error(`Unknown job type: ${job.type}`);
                }
            }
            catch (error) {
                return { error: error.message };
            }
        }));
        res.json({
            success: true,
            results
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`Synthesis Service running on port ${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/api/docs`);
});
exports.default = app;
