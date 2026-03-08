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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const cytoscape_1 = __importDefault(require("cytoscape"));
const cytoscape_cose_bilkent_1 = __importDefault(require("cytoscape-cose-bilkent"));
cytoscape_1.default.use(cytoscape_cose_bilkent_1.default);
const LOD_ZOOM = 1;
const debounce = (fn, delay = 50) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};
const Graph = ({ elements, neighborhoodMode }) => {
    const cyRef = (0, react_1.useRef)(null);
    const cyInstance = (0, react_1.useRef)(null);
    const workerRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        workerRef.current = new Worker(new URL('./layoutWorker.ts', import.meta.url));
        workerRef.current.onmessage = (e) => {
            const cy = cyInstance.current;
            if (!cy)
                return;
            const { positions } = e.data;
            cy.startBatch();
            Object.keys(positions).forEach((id) => {
                cy.getElementById(id).position(positions[id]);
            });
            cy.endBatch();
        };
        return () => {
            workerRef.current?.terminate();
        };
    }, []);
    (0, react_1.useEffect)(() => {
        if (!cyRef.current)
            return;
        cyInstance.current = (0, cytoscape_1.default)({
            container: cyRef.current,
            elements,
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': 'mapData(deception_score, 0, 1, orange, red)',
                        label: 'data(label)',
                        color: '#fff',
                        'text-valign': 'center',
                        'font-size': '10px',
                    },
                },
                {
                    selector: 'edge',
                    style: {
                        width: 2,
                        'line-color': '#9dbaea',
                        'target-arrow-color': '#9dbaea',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                    },
                },
                { selector: '.hidden', style: { display: 'none' } },
                {
                    selector: '.lod-hidden',
                    style: { label: '', 'target-arrow-shape': 'none' },
                },
            ],
            layout: { name: 'grid', fit: true },
        });
        const cy = cyInstance.current;
        const updateLod = () => {
            const zoom = cy.zoom();
            cy.startBatch();
            if (zoom < LOD_ZOOM) {
                cy.elements().addClass('lod-hidden');
            }
            else {
                cy.elements().removeClass('lod-hidden');
            }
            cy.endBatch();
        };
        cy.on('zoom', debounce(updateLod, 50));
        updateLod();
        const runAsyncLayout = () => {
            workerRef.current?.postMessage({ elements: cy.json().elements });
        };
        runAsyncLayout();
        const handleResize = debounce(() => cy.resize(), 100);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            cy.destroy();
        };
    }, [elements]);
    (0, react_1.useEffect)(() => {
        const cy = cyInstance.current;
        if (!cy)
            return;
        const showNeighborhood = (node, hops = 2) => {
            cy.startBatch();
            cy.elements().addClass('hidden');
            let neighborhood = node;
            for (let i = 0; i < hops; i++) {
                neighborhood = neighborhood.union(neighborhood.neighborhood());
            }
            neighborhood.removeClass('hidden');
            cy.endBatch();
        };
        const reset = () => {
            cy.startBatch();
            cy.elements().removeClass('hidden');
            cy.endBatch();
        };
        const handler = (e) => showNeighborhood(e.target);
        if (neighborhoodMode) {
            cy.on('tap', 'node', handler);
            return () => {
                cy.removeListener('tap', 'node', handler);
            };
        }
        else {
            reset();
        }
    }, [neighborhoodMode]);
    return <div id="cy" ref={cyRef} style={{ height: '80vh', width: '100%' }}/>;
};
exports.default = Graph;
