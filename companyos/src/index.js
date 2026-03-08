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
const express_1 = __importStar(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const index_js_1 = require("./policy/index.js");
const step_up_route_js_1 = require("./auth/step-up-route.js");
const identity_middleware_js_1 = require("./authz/identity-middleware.js");
const disclosure_packs_js_1 = require("./api/disclosure-packs.js");
const app = (0, express_1.default)();
const port = Number(process.env.PORT || 3000);
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use(identity_middleware_js_1.stubIdentity);
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/livez', (_req, res) => res.json({ ok: true }));
const apiRouter = (0, express_1.Router)();
apiRouter.post('/auth/step-up', step_up_route_js_1.stepUpHandler);
apiRouter.use('/disclosure-packs', (0, disclosure_packs_js_1.createDisclosurePackRouter)());
app.use('/api', apiRouter);
app.post('/auth/step-up', step_up_route_js_1.stepUpHandler);
if (process.env.NODE_ENV !== 'test' &&
    process.env.POLICY_AUTO_START !== 'false') {
    try {
        (0, index_js_1.startPolicyManager)();
    }
    catch (e) {
        console.warn('policy manager start failed', e.message);
    }
}
app.listen(port, () => console.log(`[companyos] listening on :${port}`));
