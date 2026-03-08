"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const react_2 = __importDefault(require("react"));
const CsrsTimeline_1 = __importDefault(require("../components/CsrsTimeline"));
function loadPlanFixture() {
    const fixturePath = node_path_1.default.resolve(__dirname, '../../../../../python/tests/fixtures/csrs_golden_plan.json');
    const content = node_fs_1.default.readFileSync(fixturePath, 'utf-8');
    return JSON.parse(content);
}
const planFixture = loadPlanFixture();
describe('CsrsTimeline', () => {
    it('renders timeline rows with risk highlights', () => {
        (0, react_1.render)(<CsrsTimeline_1.default plan={planFixture}/>);
        expect(react_1.screen.getByRole('heading', { name: /consent-scoped retention simulator/i })).toBeVisible();
        const timelineTable = react_1.screen.getByRole('table', { name: /per-purpose deletion horizons/i });
        const rows = (0, react_1.within)(timelineTable).getAllByRole('row');
        const fraudRow = rows.find((row) => {
            const utils = (0, react_1.within)(row);
            return utils.queryByText('accounts_core') && utils.queryByText('fraud_detection');
        });
        expect(fraudRow).not.toBeUndefined();
        expect(fraudRow).toHaveAttribute('data-risk', 'breach');
        expect((0, react_1.within)(fraudRow).getByText('2023-12-28')).toBeVisible();
    });
    it('lists downstream dependency impacts', () => {
        (0, react_1.render)(<CsrsTimeline_1.default plan={planFixture}/>);
        const dependencyTable = react_1.screen.getByRole('table', { name: /downstream artifact impacts/i });
        expect((0, react_1.within)(dependencyTable).getByText('fraud_features_v4')).toBeVisible();
        expect((0, react_1.within)(dependencyTable).getByText(/eligible for deletion 33 days earlier/i)).toBeVisible();
    });
});
