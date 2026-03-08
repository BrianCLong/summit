"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const AuditDashboard_1 = __importDefault(require("./AuditDashboard"));
describe('AuditDashboard', () => {
    it('renders logs and resolutions', () => {
        (0, react_2.render)(<AuditDashboard_1.default />);
        expect(react_2.screen.getByTestId('audit-dashboard')).toBeInTheDocument();
        expect(react_2.screen.getByText('Recent Ingest Logs')).toBeInTheDocument();
        expect(react_2.screen.getByText('Entity Resolutions')).toBeInTheDocument();
    });
});
