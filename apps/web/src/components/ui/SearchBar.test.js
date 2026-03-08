"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const react_1 = require("@testing-library/react");
const SearchBar_1 = require("./SearchBar");
const react_2 = __importStar(require("react"));
// Use fake timers
vitest_1.vi.useFakeTimers();
(0, vitest_1.describe)('SearchBar', () => {
    (0, vitest_1.it)('renders correctly', () => {
        (0, react_1.render)(<SearchBar_1.SearchBar placeholder="Test Search"/>);
        (0, vitest_1.expect)(react_1.screen.getByPlaceholderText('Test Search')).toBeInTheDocument();
    });
    (0, vitest_1.it)('debounces onChange calls', () => {
        const handleChange = vitest_1.vi.fn();
        (0, react_1.render)(<SearchBar_1.SearchBar onChange={handleChange} debounceTime={300}/>);
        const input = react_1.screen.getByRole('searchbox');
        react_1.fireEvent.change(input, { target: { value: 'test' } });
        // Should not be called immediately
        (0, vitest_1.expect)(handleChange).not.toHaveBeenCalled();
        // Fast forward time
        (0, react_1.act)(() => {
            vitest_1.vi.advanceTimersByTime(300);
        });
        (0, vitest_1.expect)(handleChange).toHaveBeenCalledWith('test');
    });
    (0, vitest_1.it)('updates display value immediately', () => {
        (0, react_1.render)(<SearchBar_1.SearchBar />);
        const input = react_1.screen.getByRole('searchbox');
        react_1.fireEvent.change(input, { target: { value: 'test' } });
        (0, vitest_1.expect)(input.value).toBe('test');
    });
    (0, vitest_1.it)('works correctly as a controlled component', () => {
        const TestComponent = () => {
            const [val, setVal] = (0, react_2.useState)('initial');
            return <SearchBar_1.SearchBar value={val} onChange={setVal} debounceTime={300}/>;
        };
        (0, react_1.render)(<TestComponent />);
        const input = react_1.screen.getByRole('searchbox');
        (0, vitest_1.expect)(input.value).toBe('initial');
        // User types ' updated'
        react_1.fireEvent.change(input, { target: { value: 'initial updated' } });
        // Input should reflect change immediately (optimistic UI)
        (0, vitest_1.expect)(input.value).toBe('initial updated');
        // Parent state should NOT have updated yet
        // (We can't easily check parent state directly, but we can check if a re-render reset it if we were mocking,
        // but here we rely on the component behavior)
        // Wait for debounce
        (0, react_1.act)(() => {
            vitest_1.vi.advanceTimersByTime(300);
        });
        // Now parent update should have happened.
        // Since parent passes 'initial updated' back, and it matches internalValue, no glitch should occur.
        (0, vitest_1.expect)(input.value).toBe('initial updated');
    });
    (0, vitest_1.it)('clears value immediately when clear button is clicked', () => {
        const handleChange = vitest_1.vi.fn();
        (0, react_1.render)(<SearchBar_1.SearchBar onChange={handleChange} value="initial"/>);
        const clearButton = react_1.screen.getByRole('button', { name: /clear search/i });
        react_1.fireEvent.click(clearButton);
        (0, vitest_1.expect)(handleChange).toHaveBeenCalledWith('');
        (0, vitest_1.expect)(react_1.screen.getByRole('searchbox')).toHaveValue('');
    });
    (0, vitest_1.it)('resets timer on consecutive keystrokes', () => {
        const handleChange = vitest_1.vi.fn();
        (0, react_1.render)(<SearchBar_1.SearchBar onChange={handleChange} debounceTime={300}/>);
        const input = react_1.screen.getByRole('searchbox');
        // Type 'a'
        react_1.fireEvent.change(input, { target: { value: 'a' } });
        (0, react_1.act)(() => {
            vitest_1.vi.advanceTimersByTime(200);
        });
        (0, vitest_1.expect)(handleChange).not.toHaveBeenCalled();
        // Type 'b' (total 'ab') before timeout
        react_1.fireEvent.change(input, { target: { value: 'ab' } });
        (0, react_1.act)(() => {
            vitest_1.vi.advanceTimersByTime(200);
        });
        // Total 400ms since 'a', but only 200ms since 'b'. Should not have called yet.
        (0, vitest_1.expect)(handleChange).not.toHaveBeenCalled();
        // Wait remaining 100ms
        (0, react_1.act)(() => {
            vitest_1.vi.advanceTimersByTime(100);
        });
        (0, vitest_1.expect)(handleChange).toHaveBeenCalledWith('ab');
        (0, vitest_1.expect)(handleChange).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)('focuses input when clear button is clicked', () => {
        (0, react_1.render)(<SearchBar_1.SearchBar value="test"/>);
        const clearButton = react_1.screen.getByRole('button', { name: /clear search/i });
        const input = react_1.screen.getByRole('searchbox');
        react_1.fireEvent.click(clearButton);
        (0, vitest_1.expect)(input).toHaveFocus();
    });
});
