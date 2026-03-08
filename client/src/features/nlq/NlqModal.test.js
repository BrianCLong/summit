"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const NlqModal_tsx_1 = require("./NlqModal.tsx");
describe('NlqModal', () => {
    it('shows generated cypher after preview', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            json: async () => ({
                cypher: 'MATCH (n) RETURN n LIMIT $limit',
                costEstimate: { nodes: 1, edges: 0, rows: 1, safe: true },
            }),
        });
        (0, react_1.render)(<NlqModal_tsx_1.NlqModal />);
        react_1.fireEvent.change(react_1.screen.getByLabelText('nl-input'), {
            target: { value: 'anything' },
        });
        react_1.fireEvent.click(react_1.screen.getByText('Preview'));
        await (0, react_1.waitFor)(() => {
            expect(react_1.screen.getByLabelText('cypher-output')).toHaveTextContent('MATCH (n) RETURN n LIMIT $limit');
        });
    });
});
