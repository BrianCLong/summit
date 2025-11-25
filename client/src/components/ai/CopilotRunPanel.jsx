import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import $ from 'jquery';
import { useDispatch, useSelector } from 'react-redux';
import { useMutation } from '@apollo/client';
import { START_RUN } from '../../graphql/copilot.gql';
import { copilotActions } from '../../store/copilotSlice';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import NlGraphQueryExplainer from './NlGraphQueryExplainer';

export default function CopilotRunPanel({ goalId }) {
  const dispatch = useDispatch();
  const { currentRun, events } = useSelector((s) => s.copilot);
  const [startRun, { loading }] = useMutation(START_RUN);
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // jQuery-powered Socket.IO init
    socketRef.current = io('/', { path: '/realtime', autoConnect: true });
    $(socketRef.current).on('connect', function () {
      setConnected(true);
    });
    socketRef.current.on('copilot:event', (ev) =>
      dispatch(copilotActions.eventReceived(ev)),
    );
    return () => {
      socketRef.current && socketRef.current.disconnect();
    };
  }, [dispatch]);

  const handleStart = async () => {
    const res = await startRun({ variables: { goalId } });
    const run = res?.data?.startCopilotRun;
    dispatch(copilotActions.runStarted(run));
    // join room for live events
    socketRef.current.emit('joinRun', run.id);
  };

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">Copilot Orchestration</Typography>
          <Typography variant="body2" color="text.secondary">
            Socket: {connected ? 'connected' : 'disconnected'}
          </Typography>
          <Button
            variant="contained"
            onClick={handleStart}
            disabled={loading || !goalId}
          >
            {loading ? 'Starting…' : 'Run Copilot'}
          </Button>
        </CardContent>
      </Card>

      {currentRun && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1">Plan</Typography>
            <List dense>
              {currentRun.plan.steps.map((s) => (
                <ListItem key={s.id}>
                  <ListItemText primary={s.kind} secondary={s.status} />
                </ListItem>
              ))}
            </List>

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
              Live Events
            </Typography>
            <List dense aria-live="polite">
              {events.map((e, i) => (
                <ListItem key={i}>
                  <ListItemText
                    primary={`${e.level}: ${e.message}`}
                    secondary={new Date(e.ts).toLocaleTimeString()}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      <NlGraphQueryExplainer />
    </Box>
  );
}
