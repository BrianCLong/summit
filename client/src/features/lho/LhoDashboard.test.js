"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const LhoDashboard_1 = require("./LhoDashboard");
describe('LhoDashboard', () => {
    it('renders summary and verifies custody chain', async () => {
        (0, react_1.render)(<LhoDashboard_1.LhoDashboard />);
        expect(react_1.screen.getByText('Hold Summary')).toBeInTheDocument();
        expect(await react_1.screen.findByText('Chain intact')).toBeInTheDocument();
        expect(react_1.screen.getByText('hold-123')).toBeInTheDocument();
    });
    it('shows deterministic diff ordering', async () => {
        (0, react_1.render)(<LhoDashboard_1.LhoDashboard />);
        const addedPanel = react_1.screen.getByText('Added').closest('div');
        expect(addedPanel).toBeTruthy();
        const list = (0, react_1.within)(addedPanel).getAllByRole('listitem');
        const systems = list.map((item) => item.textContent?.split(':')[0]?.trim());
        expect(systems).toEqual(['elasticsearch', 'kafka', 'lifecycle', 'postgres', 's3']);
    });
});
