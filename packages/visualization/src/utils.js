"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorPalettes = void 0;
exports.getColorScale = getColorScale;
exports.normalizeData = normalizeData;
exports.sortData = sortData;
exports.groupData = groupData;
exports.aggregateData = aggregateData;
exports.calculateInnerDimensions = calculateInnerDimensions;
exports.createMargin = createMargin;
exports.createLinearScale = createLinearScale;
exports.createBandScale = createBandScale;
exports.createTimeScale = createTimeScale;
exports.formatNumber = formatNumber;
exports.formatPercentage = formatPercentage;
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatLargeNumber = formatLargeNumber;
exports.distance = distance;
exports.midpoint = midpoint;
exports.angle = angle;
exports.polarToCartesian = polarToCartesian;
exports.mean = mean;
exports.median = median;
exports.standardDeviation = standardDeviation;
exports.percentile = percentile;
exports.correlation = correlation;
exports.exportToSVG = exportToSVG;
exports.exportToPNG = exportToPNG;
exports.exportToJSON = exportToJSON;
exports.exportToCSV = exportToCSV;
exports.debounce = debounce;
exports.throttle = throttle;
const d3 = __importStar(require("d3"));
// Color utilities
exports.colorPalettes = {
    categorical: [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ],
    sequential: {
        blues: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],
        greens: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'],
        reds: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'],
    },
    diverging: {
        redBlue: ['#d73027', '#f46d43', '#fdae61', '#fee08b', '#ffffbf', '#e6f598', '#abdda4', '#66c2a5', '#3288bd', '#5e4fa2'],
        purpleGreen: ['#762a83', '#9970ab', '#c2a5cf', '#e7d4e8', '#f7f7f7', '#d9f0d3', '#a6dba0', '#5aae61', '#1b7837'],
    },
};
function getColorScale(config) {
    switch (config.type) {
        case 'linear':
            return d3.scaleLinear()
                .domain(config.domain)
                .range(config.range)
                .interpolate(d3.interpolateRgb);
        case 'log':
            return d3.scaleLog()
                .domain(config.domain)
                .range(config.range);
        case 'sqrt':
            return d3.scaleSqrt()
                .domain(config.domain)
                .range(config.range);
        case 'categorical':
            return d3.scaleOrdinal()
                .domain(config.domain)
                .range(config.range);
        case 'sequential':
            return d3.scaleSequential(d3.interpolateRgb(config.range[0], config.range[1]))
                .domain(config.domain);
        case 'diverging':
            const divergingScale = d3.scaleDiverging(d3.interpolateRgb(config.range[0], config.range[1])).domain(config.domain);
            return divergingScale;
        default:
            return () => config.range[0];
    }
}
// Data utilities
function normalizeData(data, field, min = 0, max = 1) {
    const values = data.map(d => Number(d[field]));
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    return data.map(d => ({
        ...d,
        [field]: ((Number(d[field]) - dataMin) / (dataMax - dataMin)) * (max - min) + min,
    }));
}
function sortData(data, field, order = 'asc') {
    return [...data].sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return order === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const aStr = String(aVal);
        const bStr = String(bVal);
        return order === 'asc'
            ? aStr.localeCompare(bStr)
            : bStr.localeCompare(aStr);
    });
}
function groupData(data, field) {
    return data.reduce((groups, item) => {
        const key = String(item[field]);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {});
}
function aggregateData(data, groupBy, aggregateField, operation = 'sum') {
    const groups = groupData(data, groupBy);
    return Object.entries(groups).map(([key, items]) => {
        let value;
        switch (operation) {
            case 'count':
                value = items.length;
                break;
            case 'sum':
                value = items.reduce((sum, item) => sum + Number(item[aggregateField]), 0);
                break;
            case 'avg':
                value = items.reduce((sum, item) => sum + Number(item[aggregateField]), 0) / items.length;
                break;
            case 'min':
                value = Math.min(...items.map(item => Number(item[aggregateField])));
                break;
            case 'max':
                value = Math.max(...items.map(item => Number(item[aggregateField])));
                break;
            case 'median':
                const sorted = items.map(item => Number(item[aggregateField])).sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                value = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
                break;
            default:
                value = 0;
        }
        return {
            id: key,
            [groupBy]: key,
            [aggregateField]: value,
        };
    });
}
// Layout utilities
function calculateInnerDimensions(containerDimension, margin) {
    return {
        width: containerDimension.width - margin.left - margin.right,
        height: containerDimension.height - margin.top - margin.bottom,
    };
}
function createMargin(top = 20, right = 20, bottom = 20, left = 20) {
    return { top, right, bottom, left };
}
// Scale utilities
function createLinearScale(domain, range) {
    return d3.scaleLinear().domain(domain).range(range);
}
function createBandScale(domain, range, padding = 0.1) {
    return d3.scaleBand().domain(domain).range(range).padding(padding);
}
function createTimeScale(domain, range) {
    return d3.scaleTime().domain(domain).range(range);
}
// Format utilities
function formatNumber(value, decimals = 2) {
    return value.toFixed(decimals);
}
function formatPercentage(value, decimals = 1) {
    return `${(value * 100).toFixed(decimals)}%`;
}
function formatCurrency(value, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(value);
}
function formatDate(date, format = 'short') {
    const options = format === 'short' ? { month: 'short', day: 'numeric', year: 'numeric' }
        : format === 'long' ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
            : { month: 'numeric', day: 'numeric', year: 'numeric' };
    return new Intl.DateTimeFormat('en-US', options).format(date);
}
function formatLargeNumber(value) {
    if (value >= 1e9) {
        return `${(value / 1e9).toFixed(1)}B`;
    }
    if (value >= 1e6) {
        return `${(value / 1e6).toFixed(1)}M`;
    }
    if (value >= 1e3) {
        return `${(value / 1e3).toFixed(1)}K`;
    }
    return value.toString();
}
// Geometry utilities
function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}
function midpoint(x1, y1, x2, y2) {
    return [(x1 + x2) / 2, (y1 + y2) / 2];
}
function angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
}
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180);
    return [
        centerX + radius * Math.cos(angleInRadians),
        centerY + radius * Math.sin(angleInRadians),
    ];
}
// Statistical utilities
function mean(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}
function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}
function standardDeviation(values) {
    const avg = mean(values);
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(mean(squaredDiffs));
}
function percentile(values, p) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
function correlation(x, y) {
    const n = Math.min(x.length, y.length);
    const meanX = mean(x);
    const meanY = mean(y);
    let numerator = 0;
    let denominatorX = 0;
    let denominatorY = 0;
    for (let i = 0; i < n; i++) {
        const diffX = x[i] - meanX;
        const diffY = y[i] - meanY;
        numerator += diffX * diffY;
        denominatorX += diffX * diffX;
        denominatorY += diffY * diffY;
    }
    return numerator / Math.sqrt(denominatorX * denominatorY);
}
// Export utilities
async function exportToSVG(svgElement, filename = 'visualization.svg') {
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    downloadBlob(blob, filename);
}
async function exportToPNG(svgElement, filename = 'visualization.png', scale = 2) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }
    const svgRect = svgElement.getBoundingClientRect();
    canvas.width = svgRect.width * scale;
    canvas.height = svgRect.height * scale;
    ctx.scale(scale, scale);
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    return new Promise((resolve) => {
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => {
                if (blob) {
                    downloadBlob(blob, filename);
                }
                resolve();
            });
        };
        img.src = url;
    });
}
function exportToJSON(data, filename = 'data.json') {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, filename);
}
function exportToCSV(data, filename = 'data.csv') {
    if (data.length === 0) {
        return;
    }
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, filename);
}
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
// Debounce and throttle utilities
function debounce(func, wait) {
    let timeout = null;
    return function (...args) {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => func(...args), wait);
    };
}
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
