"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandCenterStyle = exports.SixColumns = exports.TwoColumns = exports.ErrorState = exports.Loading = exports.Default = void 0;
const KPIStrip_1 = require("./KPIStrip");
const data_json_1 = __importDefault(require("@/mock/data.json"));
const meta = {
    title: 'Panels/KPIStrip',
    component: KPIStrip_1.KPIStrip,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
};
exports.default = meta;
exports.Default = {
    args: {
        data: data_json_1.default.kpiMetrics,
        onSelect: metric => console.log('Selected metric:', metric),
    },
};
exports.Loading = {
    args: {
        data: [],
        loading: true,
        columns: 4,
    },
};
exports.ErrorState = {
    args: {
        data: [],
        error: new Error('Failed to load KPI metrics'),
        columns: 4,
    },
};
exports.TwoColumns = {
    args: {
        data: data_json_1.default.kpiMetrics.slice(0, 2),
        columns: 2,
        onSelect: metric => console.log('Selected metric:', metric),
    },
};
exports.SixColumns = {
    args: {
        data: [
            ...data_json_1.default.kpiMetrics,
            {
                id: 'users',
                title: 'Active Users',
                value: 156,
                format: 'number',
                status: 'success',
                change: {
                    value: 8,
                    direction: 'up',
                    period: 'last week',
                },
            },
            {
                id: 'uptime',
                title: 'System Uptime',
                value: 99.8,
                format: 'percentage',
                status: 'success',
            },
        ],
        columns: 6,
        onSelect: metric => console.log('Selected metric:', metric),
    },
};
exports.CommandCenterStyle = {
    args: {
        data: [
            {
                id: 'critical_alerts',
                title: 'Critical Alerts',
                value: 2,
                format: 'number',
                status: 'error',
                change: {
                    value: 100,
                    direction: 'up',
                    period: 'last hour',
                },
            },
            {
                id: 'threat_score',
                title: 'Threat Score',
                value: 73,
                format: 'percentage',
                status: 'warning',
                change: {
                    value: 12,
                    direction: 'up',
                    period: 'last 24h',
                },
            },
            {
                id: 'investigations',
                title: 'Active Investigations',
                value: 8,
                format: 'number',
                status: 'neutral',
            },
            {
                id: 'response_time',
                title: 'Avg Response',
                value: 1847,
                format: 'duration',
                status: 'success',
                change: {
                    value: 15,
                    direction: 'down',
                    period: 'this month',
                },
            },
        ],
        columns: 4,
        className: 'bg-slate-900 p-6 rounded-lg',
        onSelect: metric => console.log('Selected metric:', metric),
    },
};
