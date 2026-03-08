"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditTimeline = AuditTimeline;
const Timeline_1 = __importDefault(require("@mui/lab/Timeline"));
const TimelineConnector_1 = __importDefault(require("@mui/lab/TimelineConnector"));
const TimelineContent_1 = __importDefault(require("@mui/lab/TimelineContent"));
const TimelineDot_1 = __importDefault(require("@mui/lab/TimelineDot"));
const TimelineItem_1 = __importDefault(require("@mui/lab/TimelineItem"));
const TimelineSeparator_1 = __importDefault(require("@mui/lab/TimelineSeparator"));
const material_1 = require("@mui/material");
const statusToColor = {
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'primary',
};
function AuditTimeline({ events }) {
    const sorted = [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    return (<material_1.Box sx={{ border: '1px solid hsl(var(--border))', borderRadius: 2, p: 2 }}>
      <material_1.Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
        Audit trail
      </material_1.Typography>
      <Timeline_1.default sx={{
            m: 0,
            p: 0,
            '& .MuiTimelineItem-root': { minHeight: 64 },
        }}>
        {sorted.map((event, index) => (<TimelineItem_1.default key={event.id}>
            <TimelineSeparator_1.default>
              <TimelineDot_1.default color={statusToColor[event.status || 'info']}>
                {index + 1}
              </TimelineDot_1.default>
              {index < sorted.length - 1 ? <TimelineConnector_1.default /> : null}
            </TimelineSeparator_1.default>
            <TimelineContent_1.default sx={{ pb: 2 }}>
              <material_1.Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <material_1.Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                  {event.kind}
                </material_1.Typography>
                <material_1.Chip size="small" label={new Date(event.at).toLocaleTimeString()} variant="outlined"/>
              </material_1.Box>
              <material_1.Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {event.message}
              </material_1.Typography>
              <material_1.Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Actor: {event.actor}
              </material_1.Typography>
            </TimelineContent_1.default>
          </TimelineItem_1.default>))}
      </Timeline_1.default>
    </material_1.Box>);
}
