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
exports.WithApollo = WithApollo;
// @ts-nocheck - React 18/19 type compatibility
const react_1 = __importStar(require("react"));
const client_1 = require("@apollo/client");
const material_1 = require("@mui/material");
function WithApollo({ children }) {
    const [client, setClient] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        Promise.resolve().then(() => __importStar(require('./createApolloClient'))).then(({ createApolloClient }) => createApolloClient())
            .then(setClient)
            .catch(setError);
    }, []);
    if (error) {
        return (<material_1.Box sx={{ p: 2, textAlign: 'center' }}>
        <div>Error initializing Apollo Client: {error.message}</div>
      </material_1.Box>);
    }
    if (!client) {
        return (<material_1.Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
            }}>
        <material_1.CircularProgress />
      </material_1.Box>);
    }
    return <client_1.ApolloProvider client={client}>{children}</client_1.ApolloProvider>;
}
