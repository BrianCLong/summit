"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AssistantPage;
const react_1 = __importDefault(require("react"));
const EnhancedAIAssistant_1 = __importDefault(require("@/components/ai-enhanced/EnhancedAIAssistant"));
const factory_1 = require("@/lib/assistant/factory");
function AssistantPage() {
    const mode = import.meta.env?.VITE_ASSISTANT_TRANSPORT ?? 'fetch';
    const transport = react_1.default.useMemo(() => (0, factory_1.makeAssistantTransport)(mode, {
        baseUrl: import.meta.env?.VITE_API_BASE ?? '/api',
        getAuthToken: () => localStorage.getItem('ig_jwt'),
        backoff: { baseMs: 300, maxMs: 4000, jitter: true },
    }), [mode]);
    return (<EnhancedAIAssistant_1.default transport={transport} typingDelayMs={150} debounceMs={120}/>);
}
