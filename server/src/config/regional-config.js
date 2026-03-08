"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentRegion = exports.getRegionUrl = exports.REGIONAL_CONFIG = void 0;
exports.REGIONAL_CONFIG = {
    'us-east-1': {
        region: 'us-east-1',
        baseUrl: process.env.REGION_URL_US_EAST_1 || 'https://us-east.intelgraph.com',
        isPublic: true,
    },
    'us-west-2': {
        region: 'us-west-2',
        baseUrl: process.env.REGION_URL_US_WEST_2 || 'https://us-west.intelgraph.com',
        isPublic: true,
    },
    'eu-central-1': {
        region: 'eu-central-1',
        baseUrl: process.env.REGION_URL_EU_CENTRAL_1 || 'https://eu-central.intelgraph.com',
        isPublic: true,
    },
    'eu-west-1': {
        region: 'eu-west-1',
        baseUrl: process.env.REGION_URL_EU_WEST_1 || 'https://eu-west.intelgraph.com',
        isPublic: true,
    },
};
const getRegionUrl = (region) => {
    return exports.REGIONAL_CONFIG[region]?.baseUrl;
};
exports.getRegionUrl = getRegionUrl;
const getCurrentRegion = () => {
    return process.env.SUMMIT_REGION || process.env.REGION || 'us-east-1';
};
exports.getCurrentRegion = getCurrentRegion;
