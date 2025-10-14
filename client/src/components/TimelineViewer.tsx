import React, { useEffect, useRef } from "react";
import { Box, Button } from "@mui/material";
import { gql, useQuery } from "@apollo/client";
import { DataSet, Timeline } from "vis-timeline/standalone";
import "vis-timeline/dist/vis-timeline-graph2d.min.css";

const EVENTS_QUERY = gql`
  query TimelineEvents($investigationId: ID!) {
    entities(investigationId: $investigationId) {
      id
      type
      createdAt
    }
    relationships(investigationId: $investigationId) {
      id
      type
      createdAt
    }
  }
`;

interface TimelineViewerProps {
  investigationId: string;
  onSelect?: (item: any) => void;
}

const TimelineViewer: React.FC<TimelineViewerProps> = ({
  investigationId,
  onSelect,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<Timeline | null>(null);

  const { data } = useQuery(EVENTS_QUERY, { variables: { investigationId } });

  useEffect(() => {
    if (containerRef.current && !timelineRef.current) {
      const items = new DataSet([]);
      timelineRef.current = new Timeline(containerRef.current, items, {
        zoomable: true,
      });
      timelineRef.current.on("select", (props) => {
        if (onSelect) {
          const item = items.get(props.items[0]);
          if (item) onSelect(item);
        }
      });
    }

    if (timelineRef.current && data) {
      const items = new DataSet([
        ...(data.entities || []).map((e: any) => ({
          id: `entity-${e.id}`,
          content: `🧩 ${e.type}`,
          start: e.createdAt,
          group: "Entities",
          data: { type: "entity", ...e },
        })),
        ...(data.relationships || []).map((r: any) => ({
          id: `rel-${r.id}`,
          content: `🔗 ${r.type}`,
          start: r.createdAt,
          group: "Relationships",
          data: { type: "relationship", ...r },
        })),
      ]);
      timelineRef.current.setItems(items);
    }
  }, [data, onSelect]);

  const setRange = (range: "hour" | "day" | "week") => {
    if (!timelineRef.current) return;
    const end = new Date();
    let start: Date;
    switch (range) {
      case "hour":
        start = new Date(end.getTime() - 60 * 60 * 1000);
        break;
      case "day":
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    timelineRef.current.setWindow(start, end);
  };

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <Button size="small" onClick={() => setRange("hour")}>
          Hour
        </Button>
        <Button size="small" onClick={() => setRange("day")}>
          Day
        </Button>
        <Button size="small" onClick={() => setRange("week")}>
          Week
        </Button>
      </Box>
      <Box ref={containerRef} sx={{ height: 300 }} />
    </Box>
  );
};

export default TimelineViewer;
