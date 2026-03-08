"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FocusOrderPanel = FocusOrderPanel;
const react_1 = __importDefault(require("react"));
function FocusOrderPanel({ steps }) {
    if (!steps.length) {
        return <p role="status">No focusable elements detected.</p>;
    }
    return (<div role="table" aria-label="focus order table">
      <div className="table" role="rowgroup">
        <div role="row" className="table-head" style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr' }}>
          <strong role="columnheader">#</strong>
          <strong role="columnheader">Label</strong>
          <strong role="columnheader">Node</strong>
          <strong role="columnheader">TabIndex</strong>
        </div>
        {steps.map((step) => (<div key={`${step.index}-${step.nodeLabel}`} role="row" className="table-row" style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr' }}>
            <span role="cell">{step.index}</span>
            <span role="cell">{step.nodeLabel}</span>
            <span role="cell">{step.nodeName}</span>
            <span role="cell">{step.tabIndex}</span>
          </div>))}
      </div>
    </div>);
}
