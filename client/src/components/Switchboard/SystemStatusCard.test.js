"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const SystemStatusCard_1 = __importDefault(require("./SystemStatusCard"));
describe('SystemStatusCard', () => {
    const mockStatus = {
        id: 'test',
        title: 'Test System',
        metric: '100%',
        desc: 'Test description',
        docsLink: '/docs/test',
        logsLink: '/logs/test',
        actions: [{ id: 'test-action', label: 'Test Action' }],
    };
    it('renders the system status card with all elements', () => {
        (0, react_2.render)(<SystemStatusCard_1.default status={mockStatus}/>);
        expect(react_2.screen.getByText('Test System')).toBeInTheDocument();
        expect(react_2.screen.getByText('100%')).toBeInTheDocument();
        expect(react_2.screen.getByText('Test description')).toBeInTheDocument();
        expect(react_2.screen.getByText('Docs')).toBeInTheDocument();
        expect(react_2.screen.getByText('Logs')).toBeInTheDocument();
        expect(react_2.screen.getByText('Test Action')).toBeInTheDocument();
    });
});
