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
exports.KPIStrip = KPIStrip;
const React = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const Card_1 = require("@/components/ui/Card");
const Skeleton_1 = require("@/components/ui/Skeleton");
const utils_1 = require("@/lib/utils");
function KPIStrip({ data: metrics, loading = false, error, onSelect, columns = 4, className, }) {
    const getMetricIcon = (id) => {
        switch (id) {
            case 'threats':
                return lucide_react_1.AlertTriangle;
            case 'activity':
                return lucide_react_1.Activity;
            case 'security':
                return lucide_react_1.Shield;
            case 'targets':
                return lucide_react_1.Target;
            default:
                return lucide_react_1.Activity;
        }
    };
    const formatValue = (value, format) => {
        if (typeof value === 'string') {
            return value;
        }
        switch (format) {
            case 'number':
                return value.toLocaleString();
            case 'percentage':
                return `${value}%`;
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                }).format(value);
            case 'duration':
                if (value < 60) {
                    return `${value}s`;
                }
                if (value < 3600) {
                    return `${Math.floor(value / 60)}m`;
                }
                return `${Math.floor(value / 3600)}h`;
            default:
                return value.toString();
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'success':
                return 'border-green-500 bg-green-50 dark:bg-green-900/20';
            case 'warning':
                return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
            case 'error':
                return 'border-red-500 bg-red-50 dark:bg-red-900/20';
            default:
                return 'border-gray-200 bg-gray-50 dark:bg-gray-900/20';
        }
    };
    const getChangeColor = (direction) => {
        switch (direction) {
            case 'up':
                return 'text-green-600';
            case 'down':
                return 'text-red-600';
            default:
                return 'text-muted-foreground';
        }
    };
    if (loading) {
        return (<div className={(0, utils_1.cn)('grid gap-4', `grid-cols-${columns}`, className)}>
        {[...Array(columns)].map((_, i) => (<Card_1.Card key={i}>
            <Card_1.CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton_1.Skeleton className="h-4 w-20"/>
                  <Skeleton_1.Skeleton className="h-8 w-24"/>
                </div>
                <Skeleton_1.Skeleton className="h-8 w-8 rounded"/>
              </div>
              <div className="mt-4">
                <Skeleton_1.Skeleton className="h-3 w-16"/>
              </div>
            </Card_1.CardContent>
          </Card_1.Card>))}
      </div>);
    }
    if (error) {
        return (<Card_1.Card className={className}>
        <Card_1.CardContent className="p-6">
          <div className="text-center text-destructive">
            <lucide_react_1.AlertTriangle className="h-8 w-8 mx-auto mb-2"/>
            <p className="text-sm">Failed to load KPI metrics</p>
          </div>
        </Card_1.CardContent>
      </Card_1.Card>);
    }
    return (<div className={(0, utils_1.cn)('grid gap-4', `grid-cols-${columns}`, className)}>
      {metrics.map(metric => {
            const Icon = getMetricIcon(metric.id);
            return (<Card_1.Card key={metric.id} className={(0, utils_1.cn)('cursor-pointer transition-all hover:shadow-md border-l-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', getStatusColor(metric.status))} onClick={() => onSelect?.(metric)} tabIndex={0} role="button" aria-label={`${metric.title}: ${formatValue(metric.value, metric.format)}`} onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect?.(metric);
                    }
                }}>
            <Card_1.CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatValue(metric.value, metric.format)}
                  </p>
                </div>
                <div className={(0, utils_1.cn)('h-8 w-8 rounded-lg flex items-center justify-center', metric.status === 'success' &&
                    'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400', metric.status === 'warning' &&
                    'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400', metric.status === 'error' &&
                    'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400', metric.status === 'neutral' &&
                    'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400')}>
                  <Icon className="h-4 w-4"/>
                </div>
              </div>

              {metric.change && (<div className="mt-4 flex items-center text-xs">
                  {metric.change.direction === 'up' ? (<lucide_react_1.TrendingUp className="h-3 w-3 mr-1"/>) : (<lucide_react_1.TrendingDown className="h-3 w-3 mr-1"/>)}
                  <span className={getChangeColor(metric.change.direction)}>
                    {Math.abs(metric.change.value)}%
                  </span>
                  <span className="text-muted-foreground ml-1">
                    from {metric.change.period}
                  </span>
                </div>)}
            </Card_1.CardContent>
          </Card_1.Card>);
        })}
    </div>);
}
