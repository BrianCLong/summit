"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const vitest_1 = require("vitest");
const TimelinePanel_1 = __importDefault(require("../TimelinePanel"));
(0, vitest_1.describe)('TimelinePanel', () => {
    (0, vitest_1.it)('renders agent events', () => {
        const events = [
            { id: '1', action: 'Decoy', confidence: 0.9, result: 'ok' },
        ];
        (0, react_1.render)(<TimelinePanel_1.default events={events}/>);
        (0, vitest_1.expect)(react_1.screen.getByText(/Decoy/)).toBeInTheDocument();
    });
});
