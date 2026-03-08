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
exports.GlobalSearch = GlobalSearch;
const react_1 = __importStar(require("react"));
const cmdk_1 = require("cmdk");
const lucide_react_1 = require("lucide-react");
const SearchContext_1 = require("@/contexts/SearchContext");
const react_router_dom_1 = require("react-router-dom");
const Badge_1 = require("@/components/ui/Badge");
const EmptyState_1 = require("@/components/ui/EmptyState");
const DemoIndicator_1 = require("@/components/common/DemoIndicator");
const useDebounce_1 = require("@/hooks/useDebounce");
function GlobalSearch() {
    const { isOpen, query, setQuery, closeSearch } = (0, SearchContext_1.useSearch)();
    const [results, setResults] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const navigate = (0, react_router_dom_1.useNavigate)();
    const isDemoMode = (0, DemoIndicator_1.useDemoMode)();
    const debouncedQuery = (0, useDebounce_1.useDebounce)(query, 300);
    // Mock search function
    const searchFunction = async (query) => {
        if (!query.trim()) {
            return [];
        }
        if (!query || !query.trim())
            return [];
        if (!isDemoMode) {
            return [];
        }
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200));
        const mockResults = [
            // Entities
            {
                id: 'ent-001',
                type: 'entity',
                title: 'John Anderson',
                description: 'PERSON • Senior Engineer • 95% confidence',
                href: '/explore?entity=ent-001',
                icon: lucide_react_1.User,
                badge: 'PERSON',
            },
            {
                id: 'ent-002',
                type: 'entity',
                title: '192.168.1.100',
                description: 'IP_ADDRESS • Internal network • 98% confidence',
                href: '/explore?entity=ent-002',
                icon: lucide_react_1.Zap,
                badge: 'IP',
            },
            // Investigations
            {
                id: 'inv-001',
                type: 'investigation',
                title: 'Network Security Analysis',
                description: 'Active • 12 entities • High priority',
                href: '/explore?investigation=inv-001',
                icon: lucide_react_1.Search,
                badge: 'ACTIVE',
            },
            // Alerts
            {
                id: 'alert-001',
                type: 'alert',
                title: 'Suspicious Login Activity',
                description: 'Medium severity • Investigating',
                href: '/alerts/alert-001',
                icon: lucide_react_1.AlertTriangle,
                badge: 'MEDIUM',
            },
            // Cases
            {
                id: 'case-001',
                type: 'case',
                title: 'Insider Threat Investigation',
                description: 'In Progress • High priority',
                href: '/cases/case-001',
                icon: lucide_react_1.FileText,
                badge: 'HIGH',
            },
            // Commands
            {
                id: 'cmd-explore',
                type: 'command',
                title: 'Go to Graph Explorer',
                description: 'Navigate to the graph exploration interface',
                href: '/explore',
                icon: lucide_react_1.Search,
            },
            {
                id: 'cmd-alerts',
                type: 'command',
                title: 'View Alerts',
                description: 'Navigate to alerts dashboard',
                href: '/alerts',
                icon: lucide_react_1.AlertTriangle,
            },
        ];
        // Filter results based on query
        return mockResults.filter(result => result.title.toLowerCase().includes(query.toLowerCase()) ||
            result.description?.toLowerCase().includes(query.toLowerCase()));
    };
    (0, react_1.useEffect)(() => {
        // If query is cleared, clear results immediately without waiting for debounce
        if (!query || !query.trim()) {
            setResults([]);
            return;
        }
    }, [query]);
    (0, react_1.useEffect)(() => {
        if (!debouncedQuery || !debouncedQuery.trim()) {
            return;
        }
        let active = true;
        setLoading(true);
        searchFunction(debouncedQuery)
            .then(results => {
            if (active) {
                setResults(results);
            }
        })
            .finally(() => {
            if (active) {
                setLoading(false);
            }
        });
        return () => {
            active = false;
        };
    }, [debouncedQuery, isDemoMode]);
    const handleSelect = (result) => {
        if (result.href) {
            navigate(result.href);
            closeSearch();
        }
    };
    const getTypeIcon = (type) => {
        switch (type) {
            case 'entity':
                return lucide_react_1.User;
            case 'investigation':
                return lucide_react_1.Search;
            case 'alert':
                return lucide_react_1.AlertTriangle;
            case 'case':
                return lucide_react_1.FileText;
            case 'command':
                return lucide_react_1.Zap;
            default:
                return lucide_react_1.Search;
        }
    };
    const getTypeBadgeVariant = (type) => {
        switch (type) {
            case 'entity':
                return 'secondary';
            case 'investigation':
                return 'default';
            case 'alert':
                return 'destructive';
            case 'case':
                return 'outline';
            case 'command':
                return 'intel';
            default:
                return 'secondary';
        }
    };
    if (!isOpen) {
        return null;
    }
    return (<div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-2xl">
        <cmdk_1.Command className="rounded-lg border shadow-md bg-popover" label="Global Search">
          <div className="flex items-center border-b px-3">
            <lucide_react_1.Search className="mr-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true"/>
            <cmdk_1.Command.Input aria-label="Search query" placeholder="Search entities, investigations, alerts..." value={query} onValueChange={setQuery} className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"/>
          </div>

          <cmdk_1.Command.List className="max-h-96 overflow-y-auto p-2">
            {!isDemoMode && (<div className="m-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
                Live search is unavailable until a backend connection is configured.
              </div>)}
            {loading && (<div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>)}

            {!loading && query && results.length === 0 && (<div className="py-2 px-2">
                <EmptyState_1.EmptyState icon="search" title="No results found" description={`We couldn't find anything matching "${query}"`} className="py-6"/>
              </div>)}

            {!query && !loading && (<div className="py-6 text-center text-sm text-muted-foreground">
                Type to search across entities, investigations, and more...
              </div>)}

            {results.length > 0 && (<>
                {/* Group results by type */}
                {['command', 'entity', 'investigation', 'alert', 'case'].map(type => {
                const typeResults = results.filter(r => r.type === type);
                if (typeResults.length === 0) {
                    return null;
                }
                return (<cmdk_1.Command.Group key={type} heading={type.charAt(0).toUpperCase() + type.slice(1)}>
                        {typeResults.map(result => {
                        const Icon = result.icon || getTypeIcon(result.type);
                        return (<cmdk_1.Command.Item key={result.id} value={result.id} onSelect={() => handleSelect(result)} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-accent rounded-md">
                              <Icon className="h-4 w-4 text-muted-foreground"/>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {result.title}
                                </div>
                                {result.description && (<div className="text-xs text-muted-foreground truncate">
                                    {result.description}
                                  </div>)}
                              </div>
                              {result.badge && (<Badge_1.Badge variant={getTypeBadgeVariant(result.type)} className="text-xs">
                                  {result.badge}
                                </Badge_1.Badge>)}
                            </cmdk_1.Command.Item>);
                    })}
                      </cmdk_1.Command.Group>);
            })}
              </>)}
          </cmdk_1.Command.List>

          <div className="border-t px-3 py-2 text-xs text-muted-foreground" aria-hidden="true">
            <div className="flex items-center justify-between">
              <span>Press Enter to select, Esc to close</span>
              <div className="flex items-center gap-1">
                <kbd className="h-5 px-1.5 rounded border bg-muted text-[10px] font-medium">
                  ↑
                </kbd>
                <kbd className="h-5 px-1.5 rounded border bg-muted text-[10px] font-medium">
                  ↓
                </kbd>
                <span className="text-[10px]">to navigate</span>
              </div>
            </div>
          </div>
        </cmdk_1.Command>
      </div>
    </div>);
}
