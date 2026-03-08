"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Variants = void 0;
const Badge_1 = require("../Badge");
const tokens_1 = require("@/theme/tokens");
const meta = {
    title: 'Design System/Badge',
    component: Badge_1.Badge,
};
exports.default = meta;
exports.Variants = {
    render: () => (<div style={{
            display: 'flex',
            gap: (0, tokens_1.tokenVar)('ds-space-xs'),
            padding: (0, tokens_1.tokenVar)('ds-space-md'),
            flexWrap: 'wrap',
        }}>
      <Badge_1.Badge variant="secondary">Secondary</Badge_1.Badge>
      <Badge_1.Badge variant="outline">Outline</Badge_1.Badge>
      <Badge_1.Badge>Default</Badge_1.Badge>
      <Badge_1.Badge className="bg-intel-700 text-white">Intel</Badge_1.Badge>
      <Badge_1.Badge className="bg-green-100 text-green-800">Success</Badge_1.Badge>
    </div>),
};
