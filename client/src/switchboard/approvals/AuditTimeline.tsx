import Timeline from "@mui/lab/Timeline";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineSeparator from "@mui/lab/TimelineSeparator";
import { Box, Chip, Typography } from "@mui/material";
import type { AuditEvent } from "./types";

const statusToColor: Record<string, "inherit" | "primary" | "success" | "warning" | "error"> = {
  success: "success",
  warning: "warning",
  error: "error",
  info: "primary",
};

interface Props {
  events: AuditEvent[];
}

export function AuditTimeline({ events }: Props) {
  const sorted = [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <Box sx={{ border: "1px solid hsl(var(--border))", borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
        Audit trail
      </Typography>
      <Timeline
        sx={{
          m: 0,
          p: 0,
          "& .MuiTimelineItem-root": { minHeight: 64 },
        }}
      >
        {sorted.map((event, index) => (
          <TimelineItem key={event.id}>
            <TimelineSeparator>
              <TimelineDot color={statusToColor[event.status || "info"]}>{index + 1}</TimelineDot>
              {index < sorted.length - 1 ? <TimelineConnector /> : null}
            </TimelineSeparator>
            <TimelineContent sx={{ pb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle2" sx={{ textTransform: "capitalize" }}>
                  {event.kind}
                </Typography>
                <Chip
                  size="small"
                  label={new Date(event.at).toLocaleTimeString()}
                  variant="outlined"
                />
              </Box>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
                {event.message}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                Actor: {event.actor}
              </Typography>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    </Box>
  );
}
