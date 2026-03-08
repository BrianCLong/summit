"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_native_1 = require("@testing-library/react-native");
const Badge_1 = require("../../src/components/ui/Badge");
describe('Badge', () => {
    it('renders correctly with text', () => {
        const { getByText } = (0, react_native_1.render)(<Badge_1.Badge>Test Badge</Badge_1.Badge>);
        expect(getByText('Test Badge')).toBeTruthy();
    });
    it('applies variant styles', () => {
        const { getByText, rerender } = (0, react_native_1.render)(<Badge_1.Badge variant="primary">Primary</Badge_1.Badge>);
        expect(getByText('Primary')).toBeTruthy();
        rerender(<Badge_1.Badge variant="destructive">Destructive</Badge_1.Badge>);
        expect(getByText('Destructive')).toBeTruthy();
        rerender(<Badge_1.Badge variant="success">Success</Badge_1.Badge>);
        expect(getByText('Success')).toBeTruthy();
    });
    it('applies size styles', () => {
        const { getByText, rerender } = (0, react_native_1.render)(<Badge_1.Badge size="sm">Small</Badge_1.Badge>);
        expect(getByText('Small')).toBeTruthy();
        rerender(<Badge_1.Badge size="lg">Large</Badge_1.Badge>);
        expect(getByText('Large')).toBeTruthy();
    });
});
describe('PriorityBadge', () => {
    it('renders CRITICAL priority', () => {
        const { getByText } = (0, react_native_1.render)(<Badge_1.PriorityBadge priority="CRITICAL"/>);
        expect(getByText('CRITICAL')).toBeTruthy();
    });
    it('renders HIGH priority', () => {
        const { getByText } = (0, react_native_1.render)(<Badge_1.PriorityBadge priority="HIGH"/>);
        expect(getByText('HIGH')).toBeTruthy();
    });
    it('renders all priority levels', () => {
        const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
        priorities.forEach((priority) => {
            const { getByText } = (0, react_native_1.render)(<Badge_1.PriorityBadge priority={priority}/>);
            expect(getByText(priority)).toBeTruthy();
        });
    });
});
describe('ClassificationBadge', () => {
    it('renders UNCLASSIFIED', () => {
        const { getByText } = (0, react_native_1.render)(<Badge_1.ClassificationBadge classification="UNCLASSIFIED"/>);
        expect(getByText('UNCLASSIFIED')).toBeTruthy();
    });
    it('renders TOP_SECRET with space', () => {
        const { getByText } = (0, react_native_1.render)(<Badge_1.ClassificationBadge classification="TOP_SECRET"/>);
        expect(getByText('TOP SECRET')).toBeTruthy();
    });
});
describe('EntityTypeBadge', () => {
    it('renders PERSON entity type', () => {
        const { getByText } = (0, react_native_1.render)(<Badge_1.EntityTypeBadge type="PERSON"/>);
        expect(getByText('PERSON')).toBeTruthy();
    });
    it('renders all entity types', () => {
        const types = [
            'PERSON',
            'ORGANIZATION',
            'LOCATION',
            'EVENT',
            'DOCUMENT',
            'THREAT',
        ];
        types.forEach((type) => {
            const { getByText } = (0, react_native_1.render)(<Badge_1.EntityTypeBadge type={type}/>);
            expect(getByText(type)).toBeTruthy();
        });
    });
});
