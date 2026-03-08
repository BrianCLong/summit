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
const react_1 = __importDefault(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const react_redux_1 = require("react-redux");
const store_1 = require("./store");
const App_1 = __importDefault(require("./App"));
const config_1 = __importDefault(require("./config"));
require("./index.css");
const reportWebVitals_1 = __importDefault(require("./reportWebVitals"));
const TenantContext_1 = require("./contexts/TenantContext");
const BrandPackContext_1 = require("./contexts/BrandPackContext");
const instrumentation_1 = require("./instrumentation");
// Initialize OpenTelemetry
(0, instrumentation_1.initializeInstrumentation)();
// Start MSW for development
async function enableMocking() {
    if (config_1.default.env !== 'development') {
        return;
    }
    const { worker } = await Promise.resolve().then(() => __importStar(require('./mock/browser')));
    return worker.start({
        onUnhandledRequest: 'bypass',
    });
}
enableMocking().then(() => {
    client_1.default.createRoot(document.getElementById('root')).render(<react_1.default.StrictMode>
      <react_redux_1.Provider store={store_1.store}>
        <TenantContext_1.TenantProvider>
          <BrandPackContext_1.BrandPackProvider>
            <App_1.default />
          </BrandPackContext_1.BrandPackProvider>
        </TenantContext_1.TenantProvider>
      </react_redux_1.Provider>
    </react_1.default.StrictMode>);
    // Initialize Web Vitals reporting
    (0, reportWebVitals_1.default)();
});
