"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decorators = void 0;
const addon_a11y_1 = require("@storybook/addon-a11y");
const heatmap_overlay_1 = require("../src/heatmap-overlay");
const preview = {
    parameters: {
        controls: { expanded: true },
        actions: { argTypesRegex: '^on[A-Z].*' },
        a11y: {
            disable: false,
            config: {},
            element: '#root',
            manual: false,
        },
        backgrounds: { disable: true },
    },
    decorators: [addon_a11y_1.withA11y],
    globalTypes: {
        a11yHeatmap: {
            name: 'A11y Heatmap',
            description: 'Toggle runtime accessibility heatmap overlay',
            defaultValue: false,
            toolbar: {
                icon: 'paintbrush',
                items: [
                    { value: false, title: 'Off' },
                    { value: true, title: 'On' },
                ],
            },
        },
    },
};
exports.decorators = [
    (Story, context) => {
        if (context.globals.a11yHeatmap) {
            (0, heatmap_overlay_1.toggleA11yHeatmap)();
        }
        return Story();
    },
];
exports.default = preview;
