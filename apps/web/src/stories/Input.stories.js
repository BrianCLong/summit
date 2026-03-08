"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Disabled = exports.Default = void 0;
const input_1 = require("../components/ui/input");
const meta = {
    title: 'Components/Input',
    component: input_1.Input,
};
exports.default = meta;
exports.Default = {
    args: {
        placeholder: 'Enter text...',
    },
};
exports.Disabled = {
    args: {
        placeholder: 'Disabled',
        disabled: true,
    },
};
