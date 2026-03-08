"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildUsageExportUrl = exports.fetchTenantUsageRollups = void 0;
const buildQueryString = (params) => {
    const query = new URLSearchParams();
    if (params.from) {
        query.set('from', params.from);
    }
    if (params.to) {
        query.set('to', params.to);
    }
    if (params.dimension) {
        query.set('dimension', params.dimension);
    }
    if (params.dimensions) {
        params.dimensions.forEach(value => query.append('dimensions', value));
    }
    if (params.limit) {
        query.set('limit', String(params.limit));
    }
    return query.toString();
};
const fetchTenantUsageRollups = async (tenantId, params = {}) => {
    const queryString = buildQueryString(params);
    const response = await fetch(`/api/tenants/${tenantId}/usage${queryString ? `?${queryString}` : ''}`);
    if (!response.ok) {
        throw new Error('Failed to load usage rollups');
    }
    return response.json();
};
exports.fetchTenantUsageRollups = fetchTenantUsageRollups;
const buildUsageExportUrl = (tenantId, format, params = {}) => {
    const queryString = buildQueryString(params);
    return `/api/tenants/${tenantId}/usage/export.${format}${queryString ? `?${queryString}` : ''}`;
};
exports.buildUsageExportUrl = buildUsageExportUrl;
