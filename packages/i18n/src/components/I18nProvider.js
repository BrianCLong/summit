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
exports.I18nProvider = I18nProvider;
exports.withI18n = withI18n;
const react_1 = __importStar(require("react"));
const react_i18next_1 = require("react-i18next");
const i18next_1 = require("../config/i18next");
/**
 * I18n Provider Component
 *
 * Wraps the application with i18next provider and handles initialization.
 *
 * @example
 * ```tsx
 * import { I18nProvider } from '@intelgraph/i18n';
 *
 * function App() {
 *   return (
 *     <I18nProvider defaultLocale="en-US" fallbackLocale="en-US">
 *       <YourApp />
 *     </I18nProvider>
 *   );
 * }
 * ```
 */
function I18nProvider({ children, defaultLocale = 'en-US', fallbackLocale = 'en-US', debug = false, }) {
    const [i18nInstance, setI18nInstance] = (0, react_1.useState)(() => (0, i18next_1.getI18nInstance)());
    const [isInitialized, setIsInitialized] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        let mounted = true;
        // Initialize i18next if not already initialized
        if (!i18nInstance.isInitialized) {
            (0, i18next_1.initI18n)({
                defaultLocale,
                fallbackLocale,
                debug,
            }).then((instance) => {
                if (mounted) {
                    setI18nInstance(instance);
                    setIsInitialized(true);
                }
            });
        }
        else {
            setIsInitialized(true);
        }
        return () => {
            mounted = false;
        };
    }, [defaultLocale, fallbackLocale, debug, i18nInstance]);
    // Show loading state while initializing
    if (!isInitialized) {
        return (<div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
            }}>
        <div>Loading translations...</div>
      </div>);
    }
    return <react_i18next_1.I18nextProvider i18n={i18nInstance}>{children}</react_i18next_1.I18nextProvider>;
}
/**
 * HOC to wrap a component with I18nProvider
 *
 * @example
 * ```tsx
 * const AppWithI18n = withI18n(App, {
 *   defaultLocale: 'en-US',
 *   fallbackLocale: 'en-US'
 * });
 * ```
 */
function withI18n(Component, config) {
    return (props) => (<I18nProvider {...config}>
      <Component {...props}/>
    </I18nProvider>);
}
