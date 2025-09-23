 
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import { io, Socket } from "socket.io-client";

interface Message {
  from: "user" | "ai";
  text: string;
}

/**
 * CopilotDrawer provides a lightweight chat interface that
 * streams messages from an AI endpoint via Socket.IO.
 */
const CopilotDrawer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io("/copilot");
    socketRef.current.on("copilot:response", (text: string) => {
      setMessages((m) => [...m, { from: "ai", text }]);
    });
    return () => socketRef.current?.disconnect();
  }, []);

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, { from: "user", text: input }]);
    socketRef.current?.emit("copilot:question", input);
    setInput("");
  };

  return (
    <>
      <IconButton
        aria-label="open copilot"
        onClick={() => setOpen(true)}
        sx={{ position: "fixed", bottom: 16, right: 16 }}
      >
        <ChatIcon />
      </IconButton>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 320, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Copilot
          </Typography>
          <List sx={{ height: 360, overflowY: "auto" }}>
            {messages.map((m, idx) => (
              <ListItem key={idx}>
                <ListItemText
                  primary={m.text}
                  secondary={m.from === "ai" ? "AI" : "You"}
                />
              </ListItem>
            ))}
          </List>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              value={input}
              onChange={(e) => setInput(e.target.value)}
              fullWidth
              size="small"
              placeholder="Ask a question"
            />
            <Button onClick={send} variant="contained">
              Send
            </Button>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default CopilotDrawer;
