"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
// @ts-ignore
const jest_axe_1 = require("jest-axe");
const CompareRun_1 = __importDefault(require("../CompareRun"));
it('CompareRun page is accessible', async () => {
    const { container } = (0, react_2.render)(<CompareRun_1.default />);
    const results = await (0, jest_axe_1.axe)(container);
    // @ts-ignore
    expect(results).toHaveNoViolations();
});
