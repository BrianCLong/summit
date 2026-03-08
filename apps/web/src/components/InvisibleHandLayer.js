"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvisibleHandLayer = InvisibleHandLayer;
const react_1 = require("react");
const react_redux_1 = require("react-redux");
function InvisibleHandLayer() {
    const { invisibleHandMode } = (0, react_redux_1.useSelector)((state) => state.ui);
    (0, react_1.useEffect)(() => {
        if (invisibleHandMode) {
            document.body.classList.add('invisible-hand-mode');
        }
        else {
            document.body.classList.remove('invisible-hand-mode');
        }
    }, [invisibleHandMode]);
    return null;
}
