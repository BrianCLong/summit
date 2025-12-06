'use client';
import React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
} from '@mui/material';
import { ShowChart as Activity } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { SystemStatus } from './types';
import Link from 'next/link';

interface SystemStatusCardProps {
  status: SystemStatus;
}

export default function SystemStatusCard({ status }: SystemStatusCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="rounded-2xl">
        <CardHeader
          title={
            <Typography
              variant="h6"
              className="flex items-center gap-2"
            >
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
              <Link href={status.docsLink} passHref>
                <Button component="a" variant="outlined" size="small">Docs</Button>
              </Link>
            )}
            {status.logsLink && (
              <Link href={status.logsLink} passHref>
                <Button component="a" variant="outlined" size="small">Logs</Button>
              </Link>
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
