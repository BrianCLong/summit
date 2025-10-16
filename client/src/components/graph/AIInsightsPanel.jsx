import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import AISuggestLinksGQL from '../ai/AISuggestLinksGQL';
import CloseIcon from '@mui/icons-material/Close';
import $ from 'jquery';
import { graphInteractionActions as g } from '../../store/slices/graphInteractionSlice';
import { getSocket } from '../../realtime/socket';

export default function AIInsightsPanel({ open, onClose }) {
  const dispatch = useDispatch();
  const { selectedNodeId, selectedEdgeId, aiInsights } = useSelector(
    (s) => s.graphInteraction,
  );
  const entityId = selectedNodeId || selectedEdgeId;
  const insight = entityId ? aiInsights[entityId] : null;
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    function onConnect() {
      setConnected(true);
    }
    function onDisconnect() {
      setConnected(false);
    }
    function onInsight(_evt, payload) {
      if (!payload?.entityId) return;
      dispatch(
        g.insightReceived({
          entityId: payload.entityId,
          data: payload.data || {},
        }),
      );
    }

    $(document).on('socket:connect', onConnect);
    $(document).on('socket:disconnect', onDisconnect);
    $(document).on('ai:insight', onInsight);

    return () => {
      $(document).off('socket:connect', onConnect);
      $(document).off('socket:disconnect', onDisconnect);
      $(document).off('ai:insight', onInsight);
    };
  }, [dispatch]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 360 } }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6">AI Insights</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="caption"
            color={connected ? 'success.main' : 'text.secondary'}
          >
            {connected ? 'live' : 'offline'}
          </Typography>
          <Tooltip title="Close">
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Divider />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
        <Tab label="Insights" />
        <Tab label="AI Suggestions" />
      </Tabs>
      <Divider />
      <Box sx={{ p: 2 }}>
        {tab === 0 && (
          <>
            {!entityId && (
              <Typography color="text.secondary">
                Select a node or edge to see insights.
              </Typography>
            )}
            {entityId && !insight && (
              <Typography color="text.secondary">
                Waiting for insights…
              </Typography>
            )}
            {entityId && insight && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Summary
                </Typography>
                <Typography sx={{ mb: 2 }}>{insight.summary || '—'}</Typography>

                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Suggested Next Actions
                </Typography>
                <List dense>
                  {(insight.suggestions || []).map((s, i) => (
                    <ListItem key={i}>
                      <ListItemText primary={s} />
                    </ListItem>
                  ))}
                </List>

                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Related Entities
                </Typography>
                <List dense>
                  {(insight.related || []).map((r) => (
                    <ListItem key={r.id}>
                      <ListItemText
                        primary={r.label || r.id}
                        secondary={r.type}
                      />
                    </ListItem>
                  ))}
                </List>

                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary">
                  Updated:{' '}
                  {insight.updatedAt
                    ? new Date(insight.updatedAt).toLocaleString()
                    : '—'}
                </Typography>
              </>
            )}
          </>
        )}
        {tab === 1 && <AISuggestLinksGQL entityId={entityId} limit={8} />}
      </Box>
    </Drawer>
  );
}
