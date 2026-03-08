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
exports.GlobalCommandPalette = GlobalCommandPalette;
const react_1 = __importStar(require("react"));
const react_router_dom_1 = require("react-router-dom");
const CommandPalette_1 = __importDefault(require("./CommandPalette"));
const commandRegistry_1 = require("./commandRegistry");
function useRegisterDefaultCommands() {
    const navigate = (0, react_router_dom_1.useNavigate)();
    (0, react_1.useEffect)(() => {
        const registrars = [
            (0, commandRegistry_1.registerCommand)({
                id: 'open-case',
                title: 'Open case workspace',
                description: 'Jump to case management',
                href: '/cases',
                category: 'Navigation',
                keywords: ['investigation', 'case', 'workspace'],
                action: () => navigate('/cases'),
            }),
            (0, commandRegistry_1.registerCommand)({
                id: 'switch-workspace',
                title: 'Switch workspace',
                description: 'Change to another analyst workspace',
                href: '/workspaces',
                category: 'Navigation',
                keywords: ['workspace', 'context'],
                action: () => navigate('/workspaces'),
            }),
            (0, commandRegistry_1.registerCommand)({
                id: 'create-note',
                title: 'Create note',
                description: 'Capture a quick note',
                href: '/notes',
                category: 'Actions',
                keywords: ['note', 'capture', 'draft'],
                action: () => navigate('/notes'),
            }),
            (0, commandRegistry_1.registerCommand)({
                id: 'jump-graph',
                title: 'Jump to graph',
                description: 'Open graph explorer',
                href: '/graph',
                category: 'Navigation',
                keywords: ['graph', 'entities', 'relationships'],
                action: () => navigate('/graph'),
            }),
            (0, commandRegistry_1.registerCommand)({
                id: 'jump-timeline',
                title: 'Jump to timeline',
                description: 'Open investigation timeline',
                href: '/investigations',
                category: 'Navigation',
                keywords: ['timeline', 'events'],
                action: () => navigate('/investigations'),
            }),
            (0, commandRegistry_1.registerCommand)({
                id: 'jump-map',
                title: 'Jump to map',
                description: 'Open GeoInt map',
                href: '/geoint',
                category: 'Navigation',
                keywords: ['map', 'geoint', 'location'],
                action: () => navigate('/geoint'),
            }),
            (0, commandRegistry_1.registerCommand)({
                id: 'open-settings',
                title: 'Open settings',
                description: 'Platform and system settings',
                href: '/system',
                category: 'Navigation',
                keywords: ['settings', 'admin'],
                action: () => navigate('/system'),
            }),
        ];
        return () => registrars.forEach((unregister) => unregister());
    }, [navigate]);
}
function GlobalCommandPalette({ open, onClose }) {
    useRegisterDefaultCommands();
    return <CommandPalette_1.default open={open} onClose={onClose}/>;
}
exports.default = GlobalCommandPalette;
