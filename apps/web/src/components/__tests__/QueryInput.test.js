"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const test_utils_1 = require("../../test-utils");
const QueryInput_1 = require("../QueryInput");
const vitest_1 = require("vitest");
(0, vitest_1.describe)('QueryInput', () => {
    const onPreview = vitest_1.vi.fn();
    (0, vitest_1.beforeEach)(() => {
        onPreview.mockClear();
    });
    (0, vitest_1.test)('renders input and button', () => {
        (0, test_utils_1.render)(<QueryInput_1.QueryInput onPreview={onPreview}/>);
        (0, vitest_1.expect)(test_utils_1.screen.getByLabelText(/Natural Language Query/i)).toBeInTheDocument();
        (0, vitest_1.expect)(test_utils_1.screen.getByRole('button', { name: /Generate Cypher/i })).toBeInTheDocument();
    });
    (0, vitest_1.test)('input change updates value', () => {
        (0, test_utils_1.render)(<QueryInput_1.QueryInput onPreview={onPreview}/>);
        const input = test_utils_1.screen.getByLabelText(/Natural Language Query/i);
        test_utils_1.fireEvent.change(input, { target: { value: 'test query' } });
        (0, vitest_1.expect)(input).toHaveValue('test query');
    });
    (0, vitest_1.test)('button is disabled when input is empty', () => {
        (0, test_utils_1.render)(<QueryInput_1.QueryInput onPreview={onPreview}/>);
        const button = test_utils_1.screen.getByRole('button', { name: /Generate Cypher/i });
        (0, vitest_1.expect)(button).toBeDisabled();
    });
    (0, vitest_1.test)('calls onPreview when button is clicked', () => {
        (0, test_utils_1.render)(<QueryInput_1.QueryInput onPreview={onPreview}/>);
        const input = test_utils_1.screen.getByLabelText(/Natural Language Query/i);
        const button = test_utils_1.screen.getByRole('button', { name: /Generate Cypher/i });
        test_utils_1.fireEvent.change(input, { target: { value: 'test query' } });
        (0, vitest_1.expect)(button).not.toBeDisabled();
        test_utils_1.fireEvent.click(button);
        (0, vitest_1.expect)(onPreview).toHaveBeenCalledWith('test query');
    });
    (0, vitest_1.test)('calls onPreview on Ctrl+Enter', () => {
        (0, test_utils_1.render)(<QueryInput_1.QueryInput onPreview={onPreview}/>);
        const input = test_utils_1.screen.getByLabelText(/Natural Language Query/i);
        test_utils_1.fireEvent.change(input, { target: { value: 'test query' } });
        test_utils_1.fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
        (0, vitest_1.expect)(onPreview).toHaveBeenCalledWith('test query');
    });
    (0, vitest_1.test)('calls onPreview on Cmd+Enter', () => {
        (0, test_utils_1.render)(<QueryInput_1.QueryInput onPreview={onPreview}/>);
        const input = test_utils_1.screen.getByLabelText(/Natural Language Query/i);
        test_utils_1.fireEvent.change(input, { target: { value: 'test query' } });
        test_utils_1.fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
        (0, vitest_1.expect)(onPreview).toHaveBeenCalledWith('test query');
    });
    (0, vitest_1.test)('shows loading state', () => {
        (0, test_utils_1.render)(<QueryInput_1.QueryInput onPreview={onPreview} loading={true}/>);
        const button = test_utils_1.screen.getByRole('button', { name: /Generate Cypher/i });
        (0, vitest_1.expect)(button).toBeDisabled();
        (0, vitest_1.expect)(button).toHaveAttribute('aria-busy', 'true');
    });
});
