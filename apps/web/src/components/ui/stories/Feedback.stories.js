"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Variants = void 0;
const alert_1 = require("../alert");
const tokens_1 = require("@/theme/tokens");
const meta = {
    title: 'Design System/Feedback/Alert',
    component: alert_1.Alert,
};
exports.default = meta;
exports.Variants = {
    render: () => (<div style={{
            display: 'grid',
            gap: (0, tokens_1.tokenVar)('ds-space-sm'),
            maxWidth: '620px',
        }}>
      <alert_1.Alert variant="success">
        <alert_1.AlertTitle>Ready</alert_1.AlertTitle>
        <alert_1.AlertDescription>
          The ingestion pipeline is healthy and ready for new documents.
        </alert_1.AlertDescription>
      </alert_1.Alert>
      <alert_1.Alert variant="warning">
        <alert_1.AlertTitle>Heads up</alert_1.AlertTitle>
        <alert_1.AlertDescription>
          Analyst coverage dips below target during APAC hours.
        </alert_1.AlertDescription>
      </alert_1.Alert>
      <alert_1.Alert variant="destructive">
        <alert_1.AlertTitle>Action required</alert_1.AlertTitle>
        <alert_1.AlertDescription>
          Anomalous download behavior detected across 3 endpoints.
        </alert_1.AlertDescription>
      </alert_1.Alert>
    </div>),
};
