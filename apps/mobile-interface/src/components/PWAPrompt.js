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
exports.PWAPrompt = PWAPrompt;
// @ts-nocheck
const react_1 = __importStar(require("react"));
function PWAPrompt() {
    const [deferredPrompt, setDeferredPrompt] = (0, react_1.useState)(null);
    const [showPrompt, setShowPrompt] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);
    const handleInstall = async () => {
        if (!deferredPrompt)
            return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowPrompt(false);
        }
        setDeferredPrompt(null);
    };
    const handleDismiss = () => {
        setShowPrompt(false);
    };
    if (!showPrompt)
        return null;
    return (<div className="fixed bottom-20 left-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Install App</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">Add to home screen for a better experience</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDismiss} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300">
            Later
          </button>
          <button onClick={handleInstall} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg">
            Install
          </button>
        </div>
      </div>
    </div>);
}
