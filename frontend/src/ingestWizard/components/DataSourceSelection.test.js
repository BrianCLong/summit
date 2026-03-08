"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const vitest_1 = require("vitest");
const DataSourceSelection_1 = __importDefault(require("./DataSourceSelection"));
const react_2 = __importDefault(require("react"));
(0, vitest_1.describe)('DataSourceSelection', () => {
    (0, vitest_1.it)('renders required indicators for mandatory fields', () => {
        const mockOnChange = vitest_1.vi.fn();
        (0, react_1.render)(<DataSourceSelection_1.default value={{}} onChange={mockOnChange}/>);
        const requiredFields = ['Name', 'Source type', 'License template'];
        requiredFields.forEach(field => {
            const labelSpan = react_1.screen.getByText(new RegExp(field), { selector: '.iw-label' });
            const indicator = labelSpan.querySelector('.iw-required-indicator');
            // Using standard assertions instead of jest-dom matchers
            (0, vitest_1.expect)(indicator).not.toBeNull();
            (0, vitest_1.expect)(indicator?.textContent).toContain('*');
            (0, vitest_1.expect)(indicator?.getAttribute('aria-hidden')).toBe('true');
        });
        const licenseLabelSpan = react_1.screen.getByText(/License template/, { selector: '.iw-label' });
        const licenseLabel = licenseLabelSpan.closest('label');
        const licenseSelect = licenseLabel?.querySelector('select');
        (0, vitest_1.expect)(licenseSelect).not.toBeNull();
        (0, vitest_1.expect)(licenseSelect?.hasAttribute('required')).toBe(true);
    });
});
