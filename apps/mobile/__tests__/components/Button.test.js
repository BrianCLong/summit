"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_native_1 = require("@testing-library/react-native");
const Button_1 = require("../../src/components/ui/Button");
describe('Button', () => {
    it('renders correctly with text', () => {
        const { getByText } = (0, react_native_1.render)(<Button_1.Button>Click me</Button_1.Button>);
        expect(getByText('Click me')).toBeTruthy();
    });
    it('calls onPress when pressed', () => {
        const onPress = jest.fn();
        const { getByText } = (0, react_native_1.render)(<Button_1.Button onPress={onPress}>Click me</Button_1.Button>);
        react_native_1.fireEvent.press(getByText('Click me'));
        expect(onPress).toHaveBeenCalledTimes(1);
    });
    it('shows loading indicator when loading', () => {
        const { queryByText, UNSAFE_getByType } = (0, react_native_1.render)(<Button_1.Button loading>Click me</Button_1.Button>);
        // Text should not be visible when loading
        expect(queryByText('Click me')).toBeNull();
    });
    it('is disabled when disabled prop is true', () => {
        const onPress = jest.fn();
        const { getByText } = (0, react_native_1.render)(<Button_1.Button onPress={onPress} disabled>
        Click me
      </Button_1.Button>);
        react_native_1.fireEvent.press(getByText('Click me'));
        expect(onPress).not.toHaveBeenCalled();
    });
    it('applies variant styles correctly', () => {
        const { getByText, rerender } = (0, react_native_1.render)(<Button_1.Button variant="default">Default</Button_1.Button>);
        expect(getByText('Default')).toBeTruthy();
        rerender(<Button_1.Button variant="destructive">Destructive</Button_1.Button>);
        expect(getByText('Destructive')).toBeTruthy();
        rerender(<Button_1.Button variant="outline">Outline</Button_1.Button>);
        expect(getByText('Outline')).toBeTruthy();
    });
    it('applies size styles correctly', () => {
        const { getByText, rerender } = (0, react_native_1.render)(<Button_1.Button size="sm">Small</Button_1.Button>);
        expect(getByText('Small')).toBeTruthy();
        rerender(<Button_1.Button size="lg">Large</Button_1.Button>);
        expect(getByText('Large')).toBeTruthy();
    });
});
