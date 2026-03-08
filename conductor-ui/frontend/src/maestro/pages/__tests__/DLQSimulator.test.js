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
const react_2 = require("@testing-library/react");
const api = __importStar(require("../../api"));
const DLQSimulator_1 = __importDefault(require("../DLQSimulator"));
test('shows decision', async () => {
    jest.spyOn(api, 'api').mockReturnValue({
        getDLQ: async () => ({
            items: [
                {
                    id: 'x',
                    runId: 'r',
                    stepId: 's',
                    kind: 'BUILD_IMAGE',
                    error: 'boom',
                    ts: Date.now(),
                },
            ],
        }),
        simulateDLQPolicy: async () => ({
            decision: 'ALLOW',
            normalizedSignature: 'sig',
            enabled: true,
            dryRun: false,
            passKind: true,
            passSig: true,
            rateLimited: false,
            reasons: [],
        }),
    });
    (0, react_2.render)(<DLQSimulator_1.default />);
    const select = await react_2.screen.findByLabelText('Pick existing DLQ item');
    react_2.fireEvent.change(select, { target: { value: 'x' } });
    react_2.fireEvent.click(react_2.screen.getByText('Simulate'));
    expect(await react_2.screen.findByText('ALLOW')).toBeInTheDocument();
});
