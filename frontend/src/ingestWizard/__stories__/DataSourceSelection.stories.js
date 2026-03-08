"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Prefilled = exports.Empty = void 0;
const react_1 = require("react");
const DataSourceSelection_1 = __importDefault(require("../components/DataSourceSelection"));
const meta = {
    title: 'Ingest Wizard/DataSourceSelection',
    component: DataSourceSelection_1.default,
    parameters: {
        layout: 'centered'
    }
};
exports.default = meta;
const Template = (initialValue) => {
    const [value, setValue] = (0, react_1.useState)(initialValue);
    return <DataSourceSelection_1.default value={value} onChange={setValue}/>;
};
exports.Empty = {
    render: () => Template({})
};
exports.Prefilled = {
    render: () => Template({
        name: 'Sanctions feed',
        source_type: 'csv',
        license_template: 'cc-by-4.0',
        retention_period: 180,
        geographic_restrictions: ['US', 'EU'],
        tos_accepted: true
    })
};
