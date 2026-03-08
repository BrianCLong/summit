"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useHoldToTalk = useHoldToTalk;
const react_1 = require("react");
const jquery_1 = __importDefault(require("jquery"));
function useHoldToTalk(onStart, onEnd) {
    const ref = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!ref.current)
            return;
        const $btn = (0, jquery_1.default)(ref.current);
        const down = () => onStart();
        const up = () => onEnd();
        $btn.on('mousedown touchstart pointerdown', down);
        (0, jquery_1.default)(window).on('mouseup touchend pointerup', up);
        return () => {
            $btn.off('mousedown touchstart pointerdown', down);
            (0, jquery_1.default)(window).off('mouseup touchend pointerup', up);
        };
    }, [onStart, onEnd]);
    return ref;
}
