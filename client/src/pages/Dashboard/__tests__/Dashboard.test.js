"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const react_redux_1 = require("react-redux");
const index_1 = __importDefault(require("../../../store/index"));
const index_2 = __importDefault(require("../index"));
test('renders dashboard skeletons then content', async () => {
    (0, react_2.render)(<react_redux_1.Provider store={index_1.default}>
      <index_2.default />
    </react_redux_1.Provider>);
    expect(react_2.screen.getByRole('status')).toBeInTheDocument();
});
