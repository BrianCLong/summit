"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
exports.formatDate = formatDate;
exports.formatRelativeTime = formatRelativeTime;
exports.capitalizeFirst = capitalizeFirst;
exports.truncateText = truncateText;
exports.getRiskColor = getRiskColor;
exports.getStatusColor = getStatusColor;
exports.debounce = debounce;
exports.generateId = generateId;
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}
function formatRelativeTime(date) {
    const now = new Date();
    const target = new Date(date);
    const diffMs = now.getTime() - target.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) {
        return 'just now';
    }
    if (diffMins < 60) {
        return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
        return `${diffDays}d ago`;
    }
    return formatDate(date);
}
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength)}...`;
}
function getRiskColor(level) {
    switch (level.toLowerCase()) {
        case 'low':
            return 'text-threat-low';
        case 'medium':
            return 'text-threat-medium';
        case 'high':
            return 'text-threat-high';
        case 'critical':
            return 'text-threat-critical';
        default:
            return 'text-muted-foreground';
    }
}
function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'active':
            return 'text-green-600';
        case 'pending':
            return 'text-yellow-600';
        case 'completed':
            return 'text-blue-600';
        case 'failed':
            return 'text-red-600';
        default:
            return 'text-muted-foreground';
    }
}
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(null, args), wait);
    };
}
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}
