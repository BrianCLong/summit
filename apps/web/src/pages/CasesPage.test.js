"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const CasesPage_1 = __importDefault(require("./CasesPage"));
const react_router_dom_1 = require("react-router-dom");
const vitest_1 = require("vitest");
const react_2 = __importDefault(require("react"));
(0, vitest_1.describe)('CasesPage', () => {
    (0, vitest_1.it)('renders filter labels associated with inputs', () => {
        (0, react_1.render)(<react_router_dom_1.MemoryRouter>
        <CasesPage_1.default />
      </react_router_dom_1.MemoryRouter>);
        // Check if labels are associated with selects
        const statusSelect = react_1.screen.getByLabelText('Status');
        (0, vitest_1.expect)(statusSelect).toBeInTheDocument();
        (0, vitest_1.expect)(statusSelect.tagName).toBe('SELECT');
        const prioritySelect = react_1.screen.getByLabelText('Priority');
        (0, vitest_1.expect)(prioritySelect).toBeInTheDocument();
        (0, vitest_1.expect)(prioritySelect.tagName).toBe('SELECT');
    });
    (0, vitest_1.it)('renders case cards as accessible links', () => {
        (0, react_1.render)(<react_router_dom_1.MemoryRouter>
        <CasesPage_1.default />
      </react_router_dom_1.MemoryRouter>);
        // Find all links that go to /cases/case-*
        const links = react_1.screen.getAllByRole('link');
        const caseLinks = links.filter(link => link.getAttribute('href')?.startsWith('/cases/case-'));
        (0, vitest_1.expect)(caseLinks.length).toBeGreaterThan(0);
        // Check the first link
        const firstLink = caseLinks[0];
        (0, vitest_1.expect)(firstLink).toHaveClass('block');
        (0, vitest_1.expect)(firstLink).toHaveClass('group');
    });
});
