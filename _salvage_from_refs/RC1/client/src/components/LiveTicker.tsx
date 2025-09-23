import React from "react";
import { gql, useSubscription } from "@apollo/client";
import { Box, List, ListItem, Typography } from "@mui/material";

const ENTITY_CREATED = gql`
  subscription EntityCreated {
    entityCreated {
      id
      label
      type
      properties
      timestamp
    }
  }
`;

const RELATIONSHIP_CREATED = gql`
  subscription RelationshipCreated {
    relationshipCreated {
      id
      from
      to
      type
      timestamp
    }
  }
`;

interface TickerItem {
  id: string;
  message: string;
  type: "entity" | "relationship";
  entityType?: string;
  timestamp: string;
  details?: string;
}

const typeIcon: Record<string, string> = {
  person: "👤",
  organization: "🏢",
  location: "📍",
};

export default function LiveTicker() {
  const [items, setItems] = React.useState<TickerItem[]>([]);

  useSubscription(ENTITY_CREATED, {
    onData: ({ data }) => {
      const entity = data.data?.entityCreated;
      if (!entity) return;
      setItems((prev) => [
        {
          id: entity.id,
          message: `${entity.label} created`,
          type: "entity",
          entityType: entity.type,
          timestamp: entity.timestamp,
          details: JSON.stringify(entity.properties, null, 2),
        },
        ...prev,
      ]);
    },
  });

  useSubscription(RELATIONSHIP_CREATED, {
    onData: ({ data }) => {
      const rel = data.data?.relationshipCreated;
      if (!rel) return;
      setItems((prev) => [
        {
          id: rel.id,
          message: `Relationship ${rel.type} created`,
          type: "relationship",
          timestamp: rel.timestamp,
          details: JSON.stringify({ from: rel.from, to: rel.to }, null, 2),
        },
        ...prev,
      ]);
    },
  });

  return (
    <Box
      sx={{ width: 300, borderLeft: "1px solid #ccc", p: 1, overflowY: "auto" }}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        Live Activity
      </Typography>
      <List>
        {items.map((item) => (
          <ListItem
            key={item.id}
            sx={{
              borderBottom: "1px solid #eee",
              position: "relative",
              "&:before": {
                content: '""',
                position: "absolute",
                left: 0,
                top: "50%",
                width: 8,
                height: 8,
                bgcolor: item.type === "entity" ? "success.main" : "info.main",
                borderRadius: "50%",
                transform: "translate(-12px, -50%)",
                animation: "pulse 2s infinite",
              },
              "@keyframes pulse": {
                "0%": {
                  transform: "translate(-12px, -50%) scale(0.8)",
                  opacity: 0.8,
                },
                "50%": {
                  transform: "translate(-12px, -50%) scale(1.2)",
                  opacity: 0.5,
                },
                "100%": {
                  transform: "translate(-12px, -50%) scale(0.8)",
                  opacity: 0.8,
                },
              },
            }}
            title={item.details}
          >
            <Typography variant="body2">
              {item.entityType ? `${typeIcon[item.entityType] || "❓"} ` : ""}
              {item.message}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
