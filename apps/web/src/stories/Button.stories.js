"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Destructive = exports.Outline = exports.Default = void 0;
const Button_1 = require("../components/ui/Button");
const meta = {
    title: 'Components/Button',
    component: Button_1.Button,
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'intel'],
        },
        size: {
            control: 'select',
            options: ['default', 'sm', 'lg', 'icon'],
        },
    },
};
exports.default = meta;
exports.Default = {
    args: {
        children: 'Button',
        variant: 'default',
    },
};
exports.Outline = {
    args: {
        children: 'Outline',
        variant: 'outline',
    },
};
exports.Destructive = {
    args: {
        children: 'Destructive',
        variant: 'destructive',
    },
};
