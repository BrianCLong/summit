import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Avatar,
  AvatarGroup,
  TextField,
} from "@mui/material";
import { People as PeopleIcon, Group as GroupIcon } from "@mui/icons-material";
import AdvancedCollaborativeGraph from "./AdvancedCollaborativeGraph";
import ThreadedComments from "../collaboration/ThreadedComments";
import { LWWElementSet } from "../../utils/lww-element-set";
import { useSocket } from "../../hooks/useSocket";
import { v4 as uuidv4 } from "uuid";

// Mock data for demonstration
const mockEntities = [
  {
    id: "person-1",
    type: "PERSON",
    props: {
      name: "John Doe",
      email: "john.doe@example.com",
      department: "Finance",
    },
  },
  {
    id: "org-1",
    type: "ORGANIZATION",
    props: {
      name: "TechCorp Inc.",
      industry: "Technology",
      location: "San Francisco",
    },
  },
  {
    id: "event-1",
    type: "EVENT",
    props: {
      name: "Board Meeting",
      date: "2025-08-15",
      importance: "HIGH",
    },
  },
  {
    id: "location-1",
    type: "LOCATION",
    props: {
      name: "Conference Room A",
      building: "HQ Building",
      floor: "12th Floor",
    },
  },
  {
    id: "asset-1",
    type: "ASSET",
    props: {
      name: "Financial Report Q3",
      type: "Document",
      classification: "Confidential",
    },
  },
];

const mockRelationships = [
  {
    id: "rel-1",
    from: "person-1",
    to: "org-1",
    type: "EMPLOYED_BY",
    props: { since: "2020-01-15" },
  },
  {
    id: "rel-2",
    from: "person-1",
    to: "event-1",
    type: "ATTENDED",
    props: { role: "Presenter" },
  },
  {
    id: "rel-3",
    from: "event-1",
    to: "location-1",
    type: "HELD_AT",
    props: { duration: "2 hours" },
  },
  {
    id: "rel-4",
    from: "person-1",
    to: "asset-1",
    type: "CREATED",
    props: { date: "2025-08-10" },
  },
];

const GraphCollaborationDemo = () => {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [comments, setComments] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [participants, setParticipants] = useState([]);
  const commentSetRef = useRef(
    LWWElementSet.deserialize(localStorage.getItem("demo-comments")),
  );
  const socket = useSocket("/realtime", {
    auth: { token: "dev-token" },
  });

  useEffect(() => {
    if (!socket.socket) return;
    const userId = "demo-user";
    socket.emit("war_room_join", {
      roomId: "demo-graph-001",
      userId,
      userInfo: { name: "Demo User" },
    });

    socket.on("war_room_sync_state", (data) => {
      setParticipants(data.participants || []);
    });
    socket.on("war_room_participant_joined", ({ participant }) => {
      setParticipants((prev) => [...prev, participant]);
    });
    socket.on("war_room_participant_left", ({ userId: leftId }) => {
      setParticipants((prev) => prev.filter((p) => p.id !== leftId));
    });

    return () => {
      socket.emit("war_room_leave", { roomId: "demo-graph-001", userId });
      socket.off("war_room_sync_state");
      socket.off("war_room_participant_joined");
      socket.off("war_room_participant_left");
    };
  }, [socket.socket]);

  useEffect(() => {
    setComments(commentSetRef.current.values());
    localStorage.setItem("demo-comments", commentSetRef.current.serialize());
  }, []);

  const handleEntitySelect = (entityId, entityData) => {
    setSelectedEntity({ id: entityId, ...entityData });
    console.log("🎯 Entity selected:", entityId, entityData);
  };

  const handleEntityUpdate = (entityId, changes) => {
    console.log("📝 Entity updated:", entityId, changes);
  };

  const handleAddComment = (entityId, comment) => {
    const record = {
      id: uuidv4(),
      entityId,
      timestamp: Date.now(),
      ...comment,
    };
    commentSetRef.current.add(record);
    setComments(commentSetRef.current.values());
    localStorage.setItem("demo-comments", commentSetRef.current.serialize());
    setReplyTo(null);
    console.log("💬 Comment added:", entityId, comment);
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <GroupIcon color="primary" sx={{ fontSize: 32 }} />
          </Grid>
          <Grid item xs>
            <Typography variant="h5" component="h1">
              Real-Time Collaborative Graph Analysis
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Advanced multi-user graph exploration with live collaboration
            </Typography>
          </Grid>
          <Grid item>
            <Chip
              icon={<PeopleIcon />}
              label="Live Demo"
              color="success"
              variant="outlined"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: "flex", gap: 2 }}>
        {/* Graph Container */}
        <Box sx={{ flexGrow: 1 }}>
          <AdvancedCollaborativeGraph
            graphId="demo-graph-001"
            entities={mockEntities}
            relationships={mockRelationships}
            onEntitySelect={handleEntitySelect}
            onEntityUpdate={handleEntityUpdate}
            onAddComment={handleAddComment}
          />
        </Box>

        {/* Info Panel */}
        <Box sx={{ width: 300 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔍 Current Analysis
              </Typography>

              <Typography variant="body2" paragraph>
                This demo showcases real-time collaborative graph analysis
                capabilities:
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  📊 Graph Statistics
                </Typography>
                <Chip
                  size="small"
                  label={`${mockEntities.length} Entities`}
                  sx={{ mr: 1, mb: 1 }}
                />
                <Chip
                  size="small"
                  label={`${mockRelationships.length} Relationships`}
                  sx={{ mr: 1, mb: 1 }}
                />
                <Chip
                  size="small"
                  label="5 Entity Types"
                  sx={{ mr: 1, mb: 1 }}
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                🚀 Collaboration Features
              </Typography>
              <Box component="ul" sx={{ fontSize: "0.875rem", pl: 2, mb: 2 }}>
                <li>Live cursor tracking</li>
                <li>Real-time entity selection</li>
                <li>Collaborative comments</li>
                <li>Presence indicators</li>
                <li>Multi-user editing</li>
                <li>Activity notifications</li>
              </Box>

              {participants.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    👥 Participants ({participants.length})
                  </Typography>
                  <AvatarGroup max={6} sx={{ mb: 1 }}>
                    {participants.map((p) => (
                      <Avatar key={p.id}>{p.name?.[0] || "?"}</Avatar>
                    ))}
                  </AvatarGroup>
                </>
              )}

              {selectedEntity && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    🎯 Selected Entity
                  </Typography>
                  <Card variant="outlined" sx={{ p: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {selectedEntity.type}:{" "}
                      {selectedEntity.name || selectedEntity.label}
                    </Typography>
                    <Typography variant="caption" display="block">
                      ID: {selectedEntity.id}
                    </Typography>
                  </Card>
                </>
              )}

              {selectedEntity && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    💬 Comments
                  </Typography>
                  <ThreadedComments
                    comments={comments.filter(
                      (c) => c.entityId === selectedEntity.id,
                    )}
                    onReply={(id) => setReplyTo(id)}
                  />
                  <Box sx={{ mt: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder={
                        replyTo ? "Reply to comment" : "Add a comment"
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target.value.trim()) {
                          handleAddComment(selectedEntity.id, {
                            text: e.target.value,
                            author: "You",
                            parentId: replyTo,
                          });
                          e.target.value = "";
                        }
                      }}
                    />
                  </Box>
                </>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                🛠️ Quick Actions
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                sx={{ mb: 1 }}
                onClick={() =>
                  window.open("http://localhost:4000/graphql", "_blank")
                }
              >
                Open GraphQL Playground
              </Button>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                sx={{ mb: 1 }}
                onClick={() => console.log("🔄 Refreshing graph data...")}
              >
                Refresh Graph Data
              </Button>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedEntity(null);
                  setComments([]);
                }}
              >
                Clear Selection
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default GraphCollaborationDemo;
