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
exports.FilterPanel = FilterPanel;
const React = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const Card_1 = require("@/components/ui/Card");
const Badge_1 = require("@/components/ui/Badge");
const Button_1 = require("@/components/ui/Button");
const Tabs_1 = require("@/components/ui/Tabs");
const Skeleton_1 = require("@/components/ui/Skeleton");
function FilterPanel({ data: filters, loading = false, onFilterChange, availableEntityTypes, availableRelationshipTypes, availableTags, availableSources, className, }) {
    const [localFilters, setLocalFilters] = React.useState(filters);
    React.useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);
    const updateFilters = (updates) => {
        const newFilters = { ...localFilters, ...updates };
        setLocalFilters(newFilters);
        onFilterChange(newFilters);
    };
    const toggleEntityType = (type) => {
        const current = localFilters.entityTypes;
        const updated = current.includes(type)
            ? current.filter(t => t !== type)
            : [...current, type];
        updateFilters({ entityTypes: updated });
    };
    const toggleRelationshipType = (type) => {
        const current = localFilters.relationshipTypes;
        const updated = current.includes(type)
            ? current.filter(t => t !== type)
            : [...current, type];
        updateFilters({ relationshipTypes: updated });
    };
    const toggleTag = (tag) => {
        const current = localFilters.tags;
        const updated = current.includes(tag)
            ? current.filter(t => t !== tag)
            : [...current, tag];
        updateFilters({ tags: updated });
    };
    const toggleSource = (source) => {
        const current = localFilters.sources;
        const updated = current.includes(source)
            ? current.filter(s => s !== source)
            : [...current, source];
        updateFilters({ sources: updated });
    };
    const clearAllFilters = () => {
        const emptyFilters = {
            entityTypes: [],
            relationshipTypes: [],
            dateRange: { start: '', end: '' },
            confidenceRange: { min: 0, max: 1 },
            tags: [],
            sources: [],
        };
        updateFilters(emptyFilters);
    };
    const getActiveFilterCount = () => {
        let count = 0;
        if (localFilters.entityTypes.length > 0) {
            count++;
        }
        if (localFilters.relationshipTypes.length > 0) {
            count++;
        }
        if (localFilters.dateRange.start || localFilters.dateRange.end) {
            count++;
        }
        if (localFilters.confidenceRange.min > 0 ||
            localFilters.confidenceRange.max < 1) {
            count++;
        }
        if (localFilters.tags.length > 0) {
            count++;
        }
        if (localFilters.sources.length > 0) {
            count++;
        }
        return count;
    };
    const activeFilterCount = getActiveFilterCount();
    if (loading) {
        return (<Card_1.Card className={className}>
        <Card_1.CardHeader>
          <Skeleton_1.Skeleton className="h-6 w-24"/>
        </Card_1.CardHeader>
        <Card_1.CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (<div key={i} className="space-y-2">
                <Skeleton_1.Skeleton className="h-4 w-16"/>
                <div className="flex flex-wrap gap-1">
                  {[...Array(3)].map((_, j) => (<Skeleton_1.Skeleton key={j} className="h-6 w-20"/>))}
                </div>
              </div>))}
          </div>
        </Card_1.CardContent>
      </Card_1.Card>);
    }
    return (<Card_1.Card className={className}>
      <Card_1.CardHeader>
        <Card_1.CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <lucide_react_1.Filter className="h-4 w-4"/>
            Filters
            {activeFilterCount > 0 && (<Badge_1.Badge variant="secondary" className="text-xs">
                {activeFilterCount}
              </Badge_1.Badge>)}
          </div>
          <div className="flex gap-1">
            <Button_1.Button variant="ghost" size="icon" onClick={clearAllFilters} disabled={activeFilterCount === 0} className="h-8 w-8">
              <lucide_react_1.RefreshCw className="h-3 w-3"/>
            </Button_1.Button>
          </div>
        </Card_1.CardTitle>
      </Card_1.CardHeader>

      <Card_1.CardContent className="space-y-4">
        <Tabs_1.Tabs defaultValue="entities" className="w-full">
          <Tabs_1.TabsList className="grid w-full grid-cols-4">
            <Tabs_1.TabsTrigger value="entities" className="text-xs">
              Entities
            </Tabs_1.TabsTrigger>
            <Tabs_1.TabsTrigger value="relations" className="text-xs">
              Relations
            </Tabs_1.TabsTrigger>
            <Tabs_1.TabsTrigger value="time" className="text-xs">
              Time
            </Tabs_1.TabsTrigger>
            <Tabs_1.TabsTrigger value="meta" className="text-xs">
              Meta
            </Tabs_1.TabsTrigger>
          </Tabs_1.TabsList>

          <Tabs_1.TabsContent value="entities" className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Entity Types
              </label>
              <div className="flex flex-wrap gap-1">
                {availableEntityTypes.map(type => (<Badge_1.Badge key={type} variant={localFilters.entityTypes.includes(type)
                ? 'default'
                : 'outline'} className="cursor-pointer text-xs" onClick={() => toggleEntityType(type)}>
                    {type.replace('_', ' ')}
                    {localFilters.entityTypes.includes(type) && (<lucide_react_1.X className="h-3 w-3 ml-1"/>)}
                  </Badge_1.Badge>))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Confidence Range
              </label>
              <div className="space-y-2">
                <input type="range" min="0" max="1" step="0.1" value={localFilters.confidenceRange.min} onChange={e => updateFilters({
            confidenceRange: {
                ...localFilters.confidenceRange,
                min: parseFloat(e.target.value),
            },
        })} className="w-full"/>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {Math.round(localFilters.confidenceRange.min * 100)}%
                  </span>
                  <span>
                    {Math.round(localFilters.confidenceRange.max * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </Tabs_1.TabsContent>

          <Tabs_1.TabsContent value="relations" className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Relationship Types
              </label>
              <div className="flex flex-wrap gap-1">
                {availableRelationshipTypes.map(type => (<Badge_1.Badge key={type} variant={localFilters.relationshipTypes.includes(type)
                ? 'default'
                : 'outline'} className="cursor-pointer text-xs" onClick={() => toggleRelationshipType(type)}>
                    {type.replace('_', ' ')}
                    {localFilters.relationshipTypes.includes(type) && (<lucide_react_1.X className="h-3 w-3 ml-1"/>)}
                  </Badge_1.Badge>))}
              </div>
            </div>
          </Tabs_1.TabsContent>

          <Tabs_1.TabsContent value="time" className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <lucide_react_1.Calendar className="h-4 w-4"/>
                Date Range
              </label>
              <div className="space-y-2">
                <input type="date" value={localFilters.dateRange.start} onChange={e => updateFilters({
            dateRange: {
                ...localFilters.dateRange,
                start: e.target.value,
            },
        })} className="w-full px-3 py-1 text-sm border rounded-md" placeholder="Start date"/>
                <input type="date" value={localFilters.dateRange.end} onChange={e => updateFilters({
            dateRange: {
                ...localFilters.dateRange,
                end: e.target.value,
            },
        })} className="w-full px-3 py-1 text-sm border rounded-md" placeholder="End date"/>
              </div>
            </div>
          </Tabs_1.TabsContent>

          <Tabs_1.TabsContent value="meta" className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <lucide_react_1.Tag className="h-4 w-4"/>
                Tags
              </label>
              <div className="flex flex-wrap gap-1">
                {availableTags.map(tag => (<Badge_1.Badge key={tag} variant={localFilters.tags.includes(tag) ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => toggleTag(tag)}>
                    {tag}
                    {localFilters.tags.includes(tag) && (<lucide_react_1.X className="h-3 w-3 ml-1"/>)}
                  </Badge_1.Badge>))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <lucide_react_1.Database className="h-4 w-4"/>
                Sources
              </label>
              <div className="flex flex-wrap gap-1">
                {availableSources.map(source => (<Badge_1.Badge key={source} variant={localFilters.sources.includes(source)
                ? 'default'
                : 'outline'} className="cursor-pointer text-xs" onClick={() => toggleSource(source)}>
                    {source}
                    {localFilters.sources.includes(source) && (<lucide_react_1.X className="h-3 w-3 ml-1"/>)}
                  </Badge_1.Badge>))}
              </div>
            </div>
          </Tabs_1.TabsContent>
        </Tabs_1.Tabs>

        {activeFilterCount > 0 && (<div className="pt-3 border-t">
            <Button_1.Button variant="outline" size="sm" onClick={clearAllFilters} className="w-full">
              <lucide_react_1.X className="h-4 w-4 mr-2"/>
              Clear All Filters
            </Button_1.Button>
          </div>)}
      </Card_1.CardContent>
    </Card_1.Card>);
}
