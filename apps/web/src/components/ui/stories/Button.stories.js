"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sizes = exports.Variants = exports.Primary = void 0;
const Button_1 = require("../Button");
const tokens_1 = require("@/theme/tokens");
const meta = {
    title: 'Design System/Button',
    component: Button_1.Button,
    args: {
        children: 'Primary action',
    },
    parameters: {
        layout: 'centered',
    },
};
exports.default = meta;
exports.Primary = {
    args: { variant: 'default' },
};
exports.Variants = {
    render: () => (<div style={{
            display: 'flex',
            gap: (0, tokens_1.tokenVar)('ds-space-sm'),
            padding: (0, tokens_1.tokenVar)('ds-space-md'),
        }}>
      <Button_1.Button variant="default">Default</Button_1.Button>
      <Button_1.Button variant="secondary">Secondary</Button_1.Button>
      <Button_1.Button variant="outline">Outline</Button_1.Button>
      <Button_1.Button variant="ghost">Ghost</Button_1.Button>
      <Button_1.Button variant="intel">Intel</Button_1.Button>
      <Button_1.Button variant="destructive">Danger</Button_1.Button>
    </div>),
};
exports.Sizes = {
    render: () => (<div style={{
            display: 'flex',
            gap: (0, tokens_1.tokenVar)('ds-space-sm'),
            padding: (0, tokens_1.tokenVar)('ds-space-md'),
        }}>
      <Button_1.Button size="sm">Small</Button_1.Button>
      <Button_1.Button size="default">Default</Button_1.Button>
      <Button_1.Button size="lg">Large</Button_1.Button>
      <Button_1.Button size="icon" aria-label="Icon button">
        🚀
      </Button_1.Button>
    </div>),
};
