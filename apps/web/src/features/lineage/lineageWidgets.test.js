"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = require("@testing-library/react");
const LineageExplorer_1 = require("./LineageExplorer");
const WhyAmISeeingThis_1 = require("./WhyAmISeeingThis");
const fixtures_1 = require("./fixtures");
const mockFetch = vitest_1.vi.fn();
(0, vitest_1.describe)('Lineage UI', () => {
    (0, vitest_1.beforeEach)(() => {
        mockFetch.mockResolvedValue({ ok: true, json: async () => fixtures_1.primaryLineageFixture });
        global.fetch = mockFetch;
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)('renders upstream and downstream chains in the explorer', async () => {
        (0, react_1.render)(<LineageExplorer_1.LineageExplorer entityId="evidence-123" initialGraph={fixtures_1.primaryLineageFixture}/>);
        const explorer = react_1.screen.getByLabelText('lineage-explorer');
        (0, vitest_1.expect)(explorer).toBeInTheDocument();
        (0, vitest_1.expect)((0, react_1.within)(explorer).getByLabelText(/source/i)).toBeInTheDocument();
        (0, vitest_1.expect)((0, react_1.within)(explorer).getByLabelText(/claim/i)).toBeInTheDocument();
        const policyTags = (0, react_1.within)(explorer).getByLabelText('policy-tags');
        (0, vitest_1.expect)(policyTags.textContent).toContain('PII');
        (0, vitest_1.expect)(policyTags.textContent).toContain('LICENSED');
    });
    (0, vitest_1.it)('embeds the why-am-i-seeing-this widget in multiple host contexts', () => {
        const GraphNodeHost = () => (<div data-testid="graph-node">
        <WhyAmISeeingThis_1.WhyAmISeeingThis entityId="evidence-123" initialGraph={fixtures_1.primaryLineageFixture}/>
      </div>);
        const EvidenceListHost = () => (<div data-testid="evidence-row">
        <WhyAmISeeingThis_1.WhyAmISeeingThis entityId="evidence-123" initialGraph={fixtures_1.primaryLineageFixture}/>
      </div>);
        (0, react_1.render)(<div>
        <GraphNodeHost />
        <EvidenceListHost />
      </div>);
        const graphWidget = (0, react_1.within)(react_1.screen.getByTestId('graph-node')).getByLabelText('why-am-i-seeing-this');
        const evidenceWidget = (0, react_1.within)(react_1.screen.getByTestId('evidence-row')).getByLabelText('why-am-i-seeing-this');
        (0, vitest_1.expect)(graphWidget).toBeInTheDocument();
        (0, vitest_1.expect)(evidenceWidget).toBeInTheDocument();
        (0, vitest_1.expect)((0, react_1.within)(graphWidget).getByTestId('upstream-summary').textContent).toContain('S3 Intake');
    });
    (0, vitest_1.it)('shows restriction messaging without leaking details', () => {
        (0, react_1.render)(<WhyAmISeeingThis_1.WhyAmISeeingThis entityId="case-locked" initialGraph={fixtures_1.restrictedLineageFixture} contextLabel="Case workspace"/>);
        (0, vitest_1.expect)(react_1.screen.getByText(/warrant-based clearance/i)).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.queryByTestId('upstream-summary')).not.toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByLabelText('policy-tags-inline').textContent).toContain('WARRANT_ONLY');
    });
    (0, vitest_1.it)('bubbles view details when available', () => {
        const onViewDetails = vitest_1.vi.fn();
        (0, react_1.render)(<WhyAmISeeingThis_1.WhyAmISeeingThis entityId="evidence-123" initialGraph={fixtures_1.primaryLineageFixture} onViewDetails={onViewDetails}/>);
        react_1.fireEvent.click(react_1.screen.getByText('View lineage'));
        (0, vitest_1.expect)(onViewDetails).toHaveBeenCalledWith(fixtures_1.primaryLineageFixture);
    });
});
