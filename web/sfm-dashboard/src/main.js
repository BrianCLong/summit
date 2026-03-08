"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const react_query_1 = require("@tanstack/react-query");
const App_1 = __importDefault(require("./App"));
require("./styles.css");
const client = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            refetchInterval: 5000,
            refetchOnWindowFocus: false
        }
    }
});
client_1.default.createRoot(document.getElementById('root')).render(<react_1.default.StrictMode>
    <react_query_1.QueryClientProvider client={client}>
      <App_1.default />
    </react_query_1.QueryClientProvider>
  </react_1.default.StrictMode>);
