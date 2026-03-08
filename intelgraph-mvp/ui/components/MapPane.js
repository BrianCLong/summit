"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MapPane;
function MapPane({ points }) {
    return <div className="p-2 border">Map Pane ({points.length} points)</div>;
}
