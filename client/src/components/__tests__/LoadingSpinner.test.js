"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const LoadingSpinner_1 = __importDefault(require("../LoadingSpinner"));
require("@testing-library/jest-dom");
describe('LoadingSpinner', () => {
    it('renders with correct accessibility attributes', () => {
        (0, react_2.render)(<LoadingSpinner_1.default />);
        const spinnerContainer = react_2.screen.getByRole('status');
        expect(spinnerContainer).toBeInTheDocument();
        expect(spinnerContainer).toHaveAttribute('aria-live', 'polite');
    });
    it('renders the message', () => {
        (0, react_2.render)(<LoadingSpinner_1.default message="Custom Loading..."/>);
        expect(react_2.screen.getByText('Custom Loading...')).toBeInTheDocument();
    });
});
