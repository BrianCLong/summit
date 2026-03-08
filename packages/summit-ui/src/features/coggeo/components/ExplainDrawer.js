"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplainDrawer = void 0;
const ExplainDrawer = ({ payload }) => {
    if (!payload) {
        return <aside>No explain payload selected.</aside>;
    }
    return (<aside>
      <h3>Explain</h3>
      <p>{payload.summary}</p>
      <small>Confidence: {payload.confidence}</small>
    </aside>);
};
exports.ExplainDrawer = ExplainDrawer;
