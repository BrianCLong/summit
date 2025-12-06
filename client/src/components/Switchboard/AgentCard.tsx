'use client';
import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
} from '@mui/material';
import { Group, Message, Phone, Videocam } from '@mui/icons-material';
import { Agent } from './types';

interface AgentCardProps {
  agents: Agent[];
  onChat: () => void;
}

export default function AgentCard({ agents, onChat }: AgentCardProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader
        title={
          <Typography variant="h6" className="flex items-center gap-2">
            <Group className="h-4 w-4" />
            Agents
          </Typography>
        }
      />
      <CardContent className="space-y-2">
        {agents.map((a) => (
          <Box
            key={a.id}
            className="flex items-center justify-between p-2 rounded-xl bg-gray-100 dark:bg-gray-800"
          >
            <Box>
              <Typography variant="subtitle1" className="font-medium">
                {a.name}
              </Typography>
              <Typography variant="caption" className="text-xs opacity-70">
                {a.tags.join(' • ')}
              </Typography>
            </Box>
            <Box className="flex gap-2">
              <Button
                size="small"
                variant="outlined"
                onClick={onChat}
                startIcon={<Message />}
              >
                Chat
              </Button>
              <Button size="small" variant="outlined" startIcon={<Phone />}>
                Call
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Videocam />}
              >
                Video
              </Button>
            </Box>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}
