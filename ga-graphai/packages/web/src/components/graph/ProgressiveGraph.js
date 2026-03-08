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
exports.MAX_VISIBLE_NODES = void 0;
exports.ProgressiveGraph = ProgressiveGraph;
const react_1 = __importStar(require("react"));
const DEFAULT_BATCH_SIZE = 80;
const DEFAULT_FRAME_BUDGET = 18;
const LOD_THRESHOLD = 320;
const MAX_VISIBLE_NODES_COMPACT = 1100;
const MAX_BATCH_SIZE = 320;
exports.MAX_VISIBLE_NODES = 1200;
const MAX_VISIBLE_EDGES_COMPACT = 3200;
const FRAME_OVERRUN_MULTIPLIER = 2.5;
function scheduleFrame(fn) {
    if (typeof requestAnimationFrame !== 'undefined') {
        return requestAnimationFrame(fn);
    }
    return setTimeout(fn, 16);
}
function cancelFrame(handle) {
    if (handle === undefined) {
        return;
    }
    if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(handle);
        return;
    }
    clearTimeout(handle);
}
function ProgressiveGraph({ nodes, edges, initialBatchSize = DEFAULT_BATCH_SIZE, frameBudgetMs = DEFAULT_FRAME_BUDGET, onHoverNode, onSelectNode, onRenderComplete, streaming = false, streamingLabel = 'Streaming results…', }) {
    const renderTarget = (0, react_1.useMemo)(() => Math.min(nodes.length, exports.MAX_VISIBLE_NODES), [nodes]);
    const [renderedCount, setRenderedCount] = (0, react_1.useState)(() => Math.min(initialBatchSize, renderTarget));
    const [lodMode, setLodMode] = (0, react_1.useState)(renderTarget > LOD_THRESHOLD ? 'compact' : 'detailed');
    const [selectedId, setSelectedId] = (0, react_1.useState)(null);
    const [hoveredId, setHoveredId] = (0, react_1.useState)(null);
    const lodModeRef = (0, react_1.useRef)(lodMode);
    const frameRef = (0, react_1.useRef)();
    const previousNodeCount = (0, react_1.useRef)(nodes.length);
    const renderedCountRef = (0, react_1.useRef)(renderedCount);
    (0, react_1.useEffect)(() => {
        lodModeRef.current = lodMode;
    }, [lodMode]);
    (0, react_1.useEffect)(() => {
        renderedCountRef.current = renderedCount;
    }, [renderedCount]);
    (0, react_1.useEffect)(() => {
        setSelectedId((current) => nodes.some((node) => node.id === current) ? current : null);
        setHoveredId((current) => nodes.some((node) => node.id === current) ? current : null);
    }, [nodes]);
    (0, react_1.useEffect)(() => {
        const initialLod = nodes.length > LOD_THRESHOLD ? 'compact' : 'detailed';
        const growingStream = streaming && nodes.length >= previousNodeCount.current;
        const startingCount = growingStream
            ? Math.min(nodes.length, Math.max(renderedCountRef.current, previousNodeCount.current))
            : Math.min(initialBatchSize, nodes.length);
        setRenderedCount(startingCount);
        setLodMode(initialLod);
        lodModeRef.current = initialLod;
        let cancelled = false;
        let currentCount = startingCount;
        let batchSize = Math.max(initialBatchSize, 1);
        const start = performance.now();
        const step = () => {
            if (cancelled)
                return;
            const frameStart = performance.now();
            let nextCount = currentCount;
            while (nextCount < renderTarget &&
                performance.now() - frameStart < frameBudgetMs) {
                const nextBatch = Math.min(batchSize * 1.35, MAX_BATCH_SIZE);
                batchSize = Math.max(Math.round(nextBatch), 1);
                nextCount = Math.min(nextCount + batchSize, renderTarget);
            }
            currentCount = nextCount;
            const elapsed = performance.now() - start;
            const shouldCompact = renderTarget > LOD_THRESHOLD &&
                (performance.now() - frameStart > frameBudgetMs ||
                    elapsed > frameBudgetMs * FRAME_OVERRUN_MULTIPLIER);
            if (shouldCompact) {
                lodModeRef.current = 'compact';
                setLodMode('compact');
            }
            const hittingCompactCeiling = lodModeRef.current === 'compact' &&
                currentCount >= Math.min(nodes.length, MAX_VISIBLE_NODES_COMPACT) &&
                nodes.length > MAX_VISIBLE_NODES_COMPACT;
            if (hittingCompactCeiling) {
                currentCount = nodes.length;
            }
            setRenderedCount(currentCount);
            if (currentCount < renderTarget) {
                frameRef.current = scheduleFrame(step);
            }
            else {
                onRenderComplete?.(performance.now() - start);
            }
        };
        frameRef.current = scheduleFrame(step);
        previousNodeCount.current = nodes.length;
        return () => {
            cancelled = true;
            cancelFrame(frameRef.current);
        };
    }, [nodes, streaming, initialBatchSize, frameBudgetMs, onRenderComplete]);
    const visibleNodes = (0, react_1.useMemo)(() => {
        const progressiveNodes = nodes.slice(0, renderedCount);
        if (lodMode === 'compact' &&
            progressiveNodes.length > MAX_VISIBLE_NODES_COMPACT) {
            const stride = Math.ceil(progressiveNodes.length / MAX_VISIBLE_NODES_COMPACT);
            return progressiveNodes
                .filter((_, index) => index % stride === 0)
                .slice(0, MAX_VISIBLE_NODES_COMPACT);
        }
        return progressiveNodes;
    }, [nodes, renderedCount, lodMode]);
    const elidedCount = (0, react_1.useMemo)(() => {
        return Math.max(nodes.length - visibleNodes.length, 0);
    }, [nodes.length, visibleNodes.length]);
    const nodeById = (0, react_1.useMemo)(() => {
        const lookup = new Map();
        for (const node of nodes) {
            lookup.set(node.id, node);
        }
        return lookup;
    }, [nodes]);
    const visibleNodeIds = (0, react_1.useMemo)(() => {
        return new Set(visibleNodes.map((node) => node.id));
    }, [visibleNodes]);
    const visibleEdges = (0, react_1.useMemo)(() => {
        const connectedEdges = edges.filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to));
        if (lodMode === 'compact') {
            return connectedEdges.slice(0, MAX_VISIBLE_EDGES_COMPACT);
        }
        return connectedEdges;
    }, [edges, visibleNodeIds, lodMode]);
    const handleHover = (id) => {
        setHoveredId(id);
        onHoverNode?.(id);
    };
    const handleSelect = (id) => {
        setSelectedId(id);
        onSelectNode?.(id);
    };
    const nodeLabel = (node, index) => {
        if (lodMode === 'compact' && index > 40) {
            return node.label.slice(0, 8) + '…';
        }
        return node.label;
    };
    return (<div role="region" aria-label="Progressive graph" aria-busy={streaming || renderedCount < nodes.length} data-visible-count={visibleNodes.length} data-elided-count={elidedCount} data-lod={lodMode} data-streaming={streaming || undefined} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg aria-hidden="true" width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {visibleEdges.map((edge) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            if (!from || !to)
                return null;
            return (<line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#cbd5e1" strokeWidth={1}/>);
        })}
      </svg>
      <div aria-live="polite" style={{ position: 'absolute', inset: 0 }} data-rendered-count={renderedCount} data-lod={lodMode}>
        {visibleNodes.map((node, index) => (<button key={node.id} type="button" data-node-id={node.id} onMouseEnter={() => handleHover(node.id)} onMouseLeave={() => handleHover(null)} onFocus={() => handleHover(node.id)} onBlur={() => handleHover(null)} onClick={() => handleSelect(node.id)} onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelect(node.id);
                }
            }} aria-pressed={selectedId === node.id} aria-label={`Node ${node.label}`} tabIndex={0} style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: (node.radius ?? 8) * 2,
                height: (node.radius ?? 8) * 2,
                borderRadius: '9999px',
                border: hoveredId === node.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: selectedId === node.id ? '#dbeafe' : '#f8fafc',
                color: '#0f172a',
                fontSize: lodMode === 'compact' ? 10 : 12,
                padding: lodMode === 'compact' ? '2px 4px' : '4px 8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
            }}>
            {nodeLabel(node, index)}
          </button>))}
        {streaming ? (<div data-streaming-indicator style={{
                position: 'absolute',
                right: 12,
                bottom: 12,
                padding: '6px 10px',
                background: '#0f172a',
                color: '#e2e8f0',
                borderRadius: 6,
                fontSize: 12,
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
            }}>
            {streamingLabel}
          </div>) : null}
      </div>
    </div>);
}
