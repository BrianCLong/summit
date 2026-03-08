"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Loading = exports.NoSelection = exports.MalwareEntity = exports.IPAddressEntity = exports.PersonEntity = exports.Default = void 0;
const EntityDrawer_1 = require("./EntityDrawer");
const Tooltip_1 = require("@/components/ui/Tooltip");
const data_json_1 = __importDefault(require("@/mock/data.json"));
const meta = {
    title: 'Panels/EntityDrawer',
    component: EntityDrawer_1.EntityDrawer,
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        Story => (<Tooltip_1.TooltipProvider>
        <div className="h-screen">
          <Story />
        </div>
      </Tooltip_1.TooltipProvider>),
    ],
    tags: ['autodocs'],
};
exports.default = meta;
exports.Default = {
    args: {
        data: data_json_1.default.entities,
        relationships: data_json_1.default.relationships,
        open: true,
        onOpenChange: () => { },
        selectedEntityId: 'ent-001',
        onSelect: entity => console.log('Selected entity:', entity),
        onAction: (action, payload) => console.log('Action:', action, payload),
    },
};
exports.PersonEntity = {
    args: {
        data: data_json_1.default.entities,
        relationships: data_json_1.default.relationships,
        open: true,
        onOpenChange: () => { },
        selectedEntityId: 'ent-001', // John Anderson
        onSelect: entity => console.log('Selected entity:', entity),
        onAction: (action, payload) => console.log('Action:', action, payload),
    },
};
exports.IPAddressEntity = {
    args: {
        data: data_json_1.default.entities,
        relationships: data_json_1.default.relationships,
        open: true,
        onOpenChange: () => { },
        selectedEntityId: 'ent-002', // IP Address
        onSelect: entity => console.log('Selected entity:', entity),
        onAction: (action, payload) => console.log('Action:', action, payload),
    },
};
exports.MalwareEntity = {
    args: {
        data: data_json_1.default.entities,
        relationships: data_json_1.default.relationships,
        open: true,
        onOpenChange: () => { },
        selectedEntityId: 'ent-004', // Malware file
        onSelect: entity => console.log('Selected entity:', entity),
        onAction: (action, payload) => console.log('Action:', action, payload),
    },
};
exports.NoSelection = {
    args: {
        data: data_json_1.default.entities,
        relationships: data_json_1.default.relationships,
        open: true,
        onOpenChange: () => { },
        selectedEntityId: undefined,
        onSelect: entity => console.log('Selected entity:', entity),
        onAction: (action, payload) => console.log('Action:', action, payload),
    },
};
exports.Loading = {
    args: {
        data: [],
        relationships: [],
        loading: true,
        open: true,
        onOpenChange: () => { },
        selectedEntityId: undefined,
    },
};
