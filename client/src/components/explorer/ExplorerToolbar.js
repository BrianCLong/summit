"use strict";
/**
 * ExplorerToolbar
 * Toolbar component for graph exploration controls
 */
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
exports.ExplorerToolbar = ExplorerToolbar;
const react_1 = __importStar(require("react"));
const utils_1 = require("@/lib/utils");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const badge_1 = require("@/components/ui/badge");
const separator_1 = require("@/components/ui/separator");
const slider_1 = require("@/components/ui/slider");
const label_1 = require("@/components/ui/label");
const types_1 = require("./types");
function ExplorerToolbar({ layout, onLayoutChange, onZoomIn, onZoomOut, onFitGraph, onCenterSelected, onRefresh, nodeCount, edgeCount, loading, filters, onFiltersChange, nodeTypes, edgeTypes, }) {
    const [showFilters, setShowFilters] = (0, react_1.useState)(false);
    const handleSearchChange = (e) => {
        onFiltersChange({ ...filters, searchQuery: e.target.value });
    };
    const handleNodeTypeToggle = (type) => {
        const current = filters.nodeTypes;
        const updated = current.includes(type)
            ? current.filter((t) => t !== type)
            : [...current, type];
        onFiltersChange({ ...filters, nodeTypes: updated });
    };
    const handleConfidenceChange = (value) => {
        onFiltersChange({ ...filters, minConfidence: value[0] / 100 });
    };
    const clearFilters = () => {
        onFiltersChange({
            nodeTypes: [],
            edgeTypes: [],
            minConfidence: 0,
            searchQuery: '',
        });
    };
    const hasActiveFilters = filters.nodeTypes.length > 0 ||
        filters.edgeTypes.length > 0 ||
        filters.minConfidence > 0 ||
        filters.searchQuery.length > 0;
    return (<div className="border-b bg-background">
      {/* Main toolbar row */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <input_1.Input type="search" placeholder="Search entities..." value={filters.searchQuery} onChange={handleSearchChange} className="h-8 pr-8"/>
          {filters.searchQuery && (<button onClick={() => onFiltersChange({ ...filters, searchQuery: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>)}
        </div>

        <separator_1.Separator orientation="vertical" className="h-6"/>

        {/* Layout selector */}
        <div className="flex items-center gap-1">
          {types_1.LAYOUT_OPTIONS.map((opt) => (<button_1.Button key={opt.name} variant={layout === opt.name ? 'default' : 'ghost'} size="sm" onClick={() => onLayoutChange(opt.name)} className="h-8 px-2" title={opt.description}>
              {opt.label}
            </button_1.Button>))}
        </div>

        <separator_1.Separator orientation="vertical" className="h-6"/>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button_1.Button variant="ghost" size="sm" onClick={onZoomOut} className="h-8 w-8 p-0" title="Zoom out">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button_1.Button>
          <button_1.Button variant="ghost" size="sm" onClick={onZoomIn} className="h-8 w-8 p-0" title="Zoom in">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button_1.Button>
          <button_1.Button variant="ghost" size="sm" onClick={onFitGraph} className="h-8 w-8 p-0" title="Fit to screen">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          </button_1.Button>
          <button_1.Button variant="ghost" size="sm" onClick={onCenterSelected} className="h-8 w-8 p-0" title="Center on selected">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button_1.Button>
        </div>

        <separator_1.Separator orientation="vertical" className="h-6"/>

        {/* Filter toggle */}
        <button_1.Button variant={showFilters ? 'secondary' : 'ghost'} size="sm" onClick={() => setShowFilters(!showFilters)} className="h-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filter
          {hasActiveFilters && (<badge_1.Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
              {filters.nodeTypes.length + (filters.minConfidence > 0 ? 1 : 0)}
            </badge_1.Badge>)}
        </button_1.Button>

        {/* Refresh */}
        <button_1.Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="h-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={(0, utils_1.cn)('mr-1', loading && 'animate-spin')}>
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
          Refresh
        </button_1.Button>

        {/* Stats */}
        <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
          <span>
            {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
          </span>
          <span className="text-muted-foreground/50">|</span>
          <span>
            {edgeCount} {edgeCount === 1 ? 'edge' : 'edges'}
          </span>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (<div className="border-t px-4 py-3 bg-muted/30">
          <div className="flex flex-wrap gap-6">
            {/* Node type filters */}
            <div className="space-y-2">
              <label_1.Label className="text-xs font-medium text-muted-foreground">
                Entity Types
              </label_1.Label>
              <div className="flex flex-wrap gap-1">
                {nodeTypes.map((type) => (<button_1.Button key={type} variant={filters.nodeTypes.includes(type) ? 'default' : 'outline'} size="sm" className="h-6 px-2 text-xs" onClick={() => handleNodeTypeToggle(type)}>
                    {type}
                  </button_1.Button>))}
              </div>
            </div>

            {/* Confidence filter */}
            <div className="space-y-2 min-w-[200px]">
              <label_1.Label className="text-xs font-medium text-muted-foreground">
                Min Confidence: {Math.round(filters.minConfidence * 100)}%
              </label_1.Label>
              <slider_1.Slider value={[filters.minConfidence * 100]} onValueChange={handleConfidenceChange} max={100} step={5} className="w-full"/>
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (<div className="flex items-end">
                <button_1.Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground">
                  Clear all filters
                </button_1.Button>
              </div>)}
          </div>
        </div>)}
    </div>);
}
