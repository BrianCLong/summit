// @ts-nocheck - React 18/19 type compatibility
"use client";
import React from "react";
import { Button, Card, CardContent, CardHeader, Typography, Box } from "@mui/material";
import { ShowChart as Activity } from "@mui/icons-material";
import { motion } from "framer-motion";
import { SystemStatus } from "./types";
import { Link } from "react-router-dom";

interface SystemStatusCardProps {
  status: SystemStatus;
}

export default function SystemStatusCard({ status }: SystemStatusCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="rounded-2xl">
        <CardHeader
          title={
            <Typography variant="h6" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {status.title}
            </Typography>
          }
        />
        <CardContent>
          <Typography variant="h4" className="font-bold">
            {status.metric}
          </Typography>
          <Typography variant="body2" className="opacity-70">
            {status.desc}
          </Typography>
          <Box className="flex gap-2 mt-4">
            {status.docsLink && (
              <Button component={Link} to={status.docsLink} variant="outlined" size="small">
                Docs
              </Button>
            )}
            {status.logsLink && (
              <Button component={Link} to={status.logsLink} variant="outlined" size="small">
                Logs
              </Button>
            )}
            {status.actions?.map((action) => (
              <Button key={action.id} variant="contained" size="small">
                {action.label}
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}
