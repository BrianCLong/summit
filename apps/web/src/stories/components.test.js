"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const react_1 = require("@testing-library/react");
const jest_axe_1 = require("jest-axe");
const Button_1 = require("../components/ui/Button");
const input_1 = require("../components/ui/input");
expect.extend(jest_axe_1.toHaveNoViolations);
describe('Components Accessibility', () => {
    it('Button should have no violations', async () => {
        const { container } = (0, react_1.render)(<Button_1.Button>Click me</Button_1.Button>);
        const results = await (0, jest_axe_1.axe)(container);
        expect(results).toHaveNoViolations();
    });
    it('Input should have no violations', async () => {
        // Input needs a label for accessibility
        const { container } = (0, react_1.render)(<div>
        <label htmlFor="test-input">Label</label>
        <input_1.Input id="test-input" placeholder="Enter text"/>
      </div>);
        const results = await (0, jest_axe_1.axe)(container);
        expect(results).toHaveNoViolations();
    });
});
