"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PolicyBadge;
function PolicyBadge({ policy }) {
    return (<span className="px-2 py-1 bg-gray-200 rounded">{policy?.sensitivity}</span>);
}
