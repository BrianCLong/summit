"use strict";
// @ts-nocheck
// API client for mobile interface
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = void 0;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
exports.apiClient = {
    async get(endpoint) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return response.json();
    },
    async post(endpoint, data) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return response.json();
    },
    async search(query) {
        return this.get(`/search?q=${encodeURIComponent(query)}`);
    },
};
