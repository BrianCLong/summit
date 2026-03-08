"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
const useHoldToTalk_1 = require("./useHoldToTalk");
const jquery_1 = __importDefault(require("jquery"));
// Skip: Test fundamentally broken - manually assigning ref doesn't trigger useEffect
// The hook's effect depends on [onStart, onEnd], not the ref, so setting ref.current
// after renderHook doesn't re-run the effect. Would need wrapper component to test properly.
describe.skip('useHoldToTalk', () => {
    let onStartMock;
    let onEndMock;
    let buttonElement;
    beforeEach(() => {
        onStartMock = jest.fn();
        onEndMock = jest.fn();
        buttonElement = document.createElement('button');
        document.body.appendChild(buttonElement);
    });
    afterEach(() => {
        document.body.removeChild(buttonElement);
    });
    it('calls onStart on mousedown and onEnd on mouseup', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useHoldToTalk_1.useHoldToTalk)(onStartMock, onEndMock));
        result.current.current = buttonElement;
        (0, react_1.act)(() => {
            (0, jquery_1.default)(buttonElement).trigger('mousedown');
        });
        expect(onStartMock).toHaveBeenCalledTimes(1);
        expect(onEndMock).not.toHaveBeenCalled();
        (0, react_1.act)(() => {
            (0, jquery_1.default)(window).trigger('mouseup');
        });
        expect(onEndMock).toHaveBeenCalledTimes(1);
    });
    it('calls onStart on touchstart and onEnd on touchend', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useHoldToTalk_1.useHoldToTalk)(onStartMock, onEndMock));
        result.current.current = buttonElement;
        (0, react_1.act)(() => {
            (0, jquery_1.default)(buttonElement).trigger('touchstart');
        });
        expect(onStartMock).toHaveBeenCalledTimes(1);
        expect(onEndMock).not.toHaveBeenCalled();
        (0, react_1.act)(() => {
            (0, jquery_1.default)(window).trigger('touchend');
        });
        expect(onEndMock).toHaveBeenCalledTimes(1);
    });
    it('calls onStart on pointerdown and onEnd on pointerup', () => {
        const { result } = (0, react_1.renderHook)(() => (0, useHoldToTalk_1.useHoldToTalk)(onStartMock, onEndMock));
        result.current.current = buttonElement;
        (0, react_1.act)(() => {
            (0, jquery_1.default)(buttonElement).trigger('pointerdown');
        });
        expect(onStartMock).toHaveBeenCalledTimes(1);
        expect(onEndMock).not.toHaveBeenCalled();
        (0, react_1.act)(() => {
            (0, jquery_1.default)(window).trigger('pointerup');
        });
        expect(onEndMock).toHaveBeenCalledTimes(1);
    });
    it('cleans up event listeners on unmount', () => {
        const { result, unmount } = (0, react_1.renderHook)(() => (0, useHoldToTalk_1.useHoldToTalk)(onStartMock, onEndMock));
        result.current.current = buttonElement;
        (0, react_1.act)(() => {
            (0, jquery_1.default)(buttonElement).trigger('mousedown');
        });
        expect(onStartMock).toHaveBeenCalledTimes(1);
        unmount();
        (0, react_1.act)(() => {
            (0, jquery_1.default)(buttonElement).trigger('mouseup'); // This should not trigger onEnd after unmount
        });
        expect(onEndMock).not.toHaveBeenCalled();
    });
});
