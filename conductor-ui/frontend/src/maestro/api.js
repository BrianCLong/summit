"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const axios_1 = __importDefault(require("axios"));
const client = axios_1.default.create({
    baseURL: '/api/maestro',
});
// Add auth token if available (simple implementation)
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
exports.api = {
    dashboard: {
        get: async () => {
            const res = await client.get('/dashboard');
            return res.data;
        },
    },
    runs: {
        list: async (params) => {
            const res = await client.get('/runs', { params });
            return res.data;
        },
        get: async (id) => {
            const res = await client.get(`/runs/${id}`);
            return res.data;
        },
        getGraph: async (id) => {
            const res = await client.get(`/runs/${id}/graph`);
            return res.data;
        },
    },
    agents: {
        list: async () => {
            const res = await client.get('/agents');
            return res.data;
        },
        update: async (id, data) => {
            const res = await client.patch(`/agents/${id}`, data);
            return res.data;
        },
    },
    autonomic: {
        listLoops: async () => {
            const res = await client.get('/autonomic/loops');
            return res.data;
        },
        toggleLoop: async (id, status) => {
            const res = await client.post(`/autonomic/loops/${id}/toggle`, { status });
            return res.data.success;
        },
    },
    mergeTrain: {
        getStatus: async () => {
            const res = await client.get('/merge-trains');
            return res.data;
        },
    },
    experiments: {
        list: async () => {
            const res = await client.get('/experiments');
            return res.data;
        },
    },
    audit: {
        getLog: async () => {
            const res = await client.get('/audit/log');
            return res.data;
        },
    },
};
