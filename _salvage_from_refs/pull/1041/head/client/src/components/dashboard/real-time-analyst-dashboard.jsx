import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
} from "@mui/lab";
import GeoMapPanel from "../geoint/GeoMapPanel";
import useSocket from "../../hooks/useSocket";

function NetworkPanel({ nodes = [], edges = [], highlightId = null }) {
  const radius = 100;
  const positioned = nodes.map((n, i) => ({
    ...n,
    x: radius + radius * Math.cos((2 * Math.PI * i) / nodes.length),
    y: radius + radius * Math.sin((2 * Math.PI * i) / nodes.length),
  }));
  const idMap = new Map(positioned.map((n) => [n.id, n]));
  return (
    <svg width="100%" height={radius * 2 + 20}>
      {edges.map((e, i) => {
        const s = idMap.get(e.source);
        const t = idMap.get(e.target);
        if (!s || !t) return null;
        return (
          <line
            key={i}
            x1={s.x}
            y1={s.y}
            x2={t.x}
            y2={t.y}
            stroke="#90caf9"
            strokeWidth="1"
          />
        );
      })}
      {positioned.map((n) => (
        <circle
          key={n.id}
          cx={n.x}
          cy={n.y}
          r={highlightId === n.id ? 10 : 6}
          fill={highlightId === n.id ? "#ff5722" : "#1976d2"}
        />
      ))}
    </svg>
  );
}

export default function RealTimeAnalystDashboard() {
  const { socket } = useSocket("/realtime");
  const [geoNodes, setGeoNodes] = useState([]);
  const [network, setNetwork] = useState({ nodes: [], edges: [] });
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [focusId, setFocusId] = useState(null);

  useEffect(() => {
    if (!socket) return;
    socket.on("geospatial:update", (data) => setGeoNodes(data.nodes || []));
    socket.on("network:update", (data) => setNetwork(data));
    socket.on("temporal:update", (event) =>
      setEvents((prev) => [event, ...prev].slice(0, 50)),
    );
    socket.on("alert", (alert) =>
      setAlerts((prev) => [alert, ...prev].slice(0, 50)),
    );
    return () => {
      socket.off("geospatial:update");
      socket.off("network:update");
      socket.off("temporal:update");
      socket.off("alert");
    };
  }, [socket]);

  return (
    <Box sx={{ mb: 4 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: 300 }}>
            <CardContent sx={{ height: "100%" }}>
              <Typography variant="h6" gutterBottom>
                Geospatial
              </Typography>
              <GeoMapPanel nodes={geoNodes} highlightId={focusId} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: 300 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Network
              </Typography>
              <NetworkPanel
                nodes={network.nodes}
                edges={network.edges}
                highlightId={focusId}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: 300 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Alerts
              </Typography>
              <List dense sx={{ maxHeight: 220, overflow: "auto" }}>
                {alerts.map((a) => (
                  <ListItem key={a.id} divider>
                    <ListItemText
                      primary={a.title || a.type}
                      secondary={a.message || a.description}
                    />
                    <Chip
                      label={a.severity}
                      color={a.severity === "critical" ? "error" : "warning"}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Timeline
              </Typography>
              <Timeline position="alternate">
                {events.map((e) => (
                  <TimelineItem
                    key={e.id}
                    onClick={() => setFocusId(e.entityId)}
                  >
                    <TimelineSeparator>
                      <TimelineDot color="primary" />
                      <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant="body2">{e.title}</Typography>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
