import React, { useState } from "react";
import { Box, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";

export default function Notes() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState("");

  const handleSave = () => {
    if (!title.trim()) return;
    setBody("");
    setTitle("");
    setTag("");
  };

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", py: 2 }}>
      <Typography variant="h4" gutterBottom>
        Notes
      </Typography>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              label="Title"
              value={title}
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
              inputProps={{ "aria-label": "Note title" }}
            />
            <TextField
              label="Tags"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="workspace, briefing, next-steps"
            />
            <TextField
              label="Body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              multiline
              minRows={6}
              placeholder="Capture your note with context, links, and follow-ups."
            />
            <Button variant="contained" onClick={handleSave}>
              Save note
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
