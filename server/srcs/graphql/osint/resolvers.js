"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.osintResolvers = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const OSINT_SERVICE_URL = process.env.OSINT_SERVICE_URL || 'http://localhost:8000';
exports.osintResolvers = {
    Query: {
        getIpReputation: async (_, { ipAddress }) => {
            const response = await axios_1.default.get(`${OSINT_SERVICE_URL}/ip_reputation/${ipAddress}`);
            return response.data;
        },
        getIpInfo: async (_, { ipAddress }) => {
            const response = await axios_1.default.get(`${OSINT_SERVICE_URL}/ip_info/${ipAddress}`);
            return response.data;
        },
        scrapeWebsite: async (_, { url }) => {
            const response = await axios_1.default.post(`${OSINT_SERVICE_URL}/scrape_website`, { url });
            return response.data;
        },
    },
    Mutation: {
        analyzeText: async (_, { text }) => {
            const response = await axios_1.default.post(`${OSINT_SERVICE_URL}/analyze_text`, { text });
            return response.data;
        },
        generateHypotheses: async (_, { data }) => {
            const response = await axios_1.default.post(`${OSINT_SERVICE_URL}/generate_hypotheses`, data);
            return response.data;
        },
        simulateThreats: async (_, { data }) => {
            const response = await axios_1.default.post(`${OSINT_SERVICE_URL}/simulate_threats`, data);
            return response.data;
        },
    },
};
