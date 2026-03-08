"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_native_1 = require("@testing-library/react-native");
const ClusteringToggle_1 = require("../../src/components/geoint/ClusteringToggle");
describe('ClusteringToggle', () => {
    it('renders toggle and triggers handler when enabled', () => {
        const onToggle = jest.fn();
        const { getByLabelText, getByText } = (0, react_native_1.render)(<ClusteringToggle_1.ClusteringToggle enabled featureFlagEnabled onToggle={onToggle}/>);
        expect(getByText('Clustering')).toBeTruthy();
        react_native_1.fireEvent.press(getByLabelText('Toggle clustering'));
        expect(onToggle).toHaveBeenCalledTimes(1);
    });
    it('does not render when feature flag disabled', () => {
        const { queryByText } = (0, react_native_1.render)(<ClusteringToggle_1.ClusteringToggle enabled={false} featureFlagEnabled={false} onToggle={jest.fn()}/>);
        expect(queryByText('Clustering')).toBeNull();
    });
});
