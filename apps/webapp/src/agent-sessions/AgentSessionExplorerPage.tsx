import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import { fetchProjects, fetchSessionDetail, fetchSessions, connectSessionStream } from './api';
import { ProjectCount, SessionDetail, SessionSummary, SessionMessage } from './types';

export function AgentSessionExplorerPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [projects, setProjects] = useState<ProjectCount[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const streamRef = useRef<{ close: () => void } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionList, projectList] = await Promise.all([
        fetchSessions({ q: search, project: projectFilter || undefined }),
        fetchProjects(),
      ]);
      setSessions(sessionList);
      setSelectedSession((current) => {
        if (!current) return current;
        const stillPresent = sessionList.some(
          (session) => session.id === current.summary.id,
        );
        if (!stillPresent) {
          streamRef.current?.close();
          setLive(false);
          return null;
        }
        return current;
      });
      setProjects(projectList);
    } catch (err: any) {
      setError(err?.message || 'Unable to load sessions');
    } finally {
      setLoading(false);
    }
  }, [projectFilter, search]);

  const loadSessionDetail = async (sessionId: string) => {
    setError(null);
    try {
      const detail = await fetchSessionDetail(sessionId);
      setSelectedSession(detail);
      setAutoScroll(true);
      attachStream(sessionId);
    } catch (err: any) {
      setError(err?.message || 'Unable to load session');
    }
  };

  const attachStream = (sessionId: string) => {
    streamRef.current?.close();
    setLive(false);
    const handle = connectSessionStream(
      sessionId,
      (detail) => {
        setSelectedSession(detail);
      },
      (connected) => setLive(connected),
    );
    streamRef.current = handle;
  };

  useEffect(() => {
    return () => {
      streamRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!selectedSession) return;
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedSession, autoScroll]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadSessions();
    }, 300);
    return () => clearTimeout(timeout);
  }, [loadSessions]);

  const handleCopyResume = async (resumeCommand: string) => {
    try {
      await navigator.clipboard.writeText(resumeCommand);
    } catch (err) {
      console.error('Failed to copy resume command', err);
    }
  };

  const liveLabel = useMemo(() => (live ? 'Live' : 'Idle'), [live]);

  const renderMessage = (message: SessionMessage) => (
    <Paper key={message.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <Chip size="small" label={message.role} color={message.role === 'user' ? 'primary' : 'default'} />
        {message.ts && (
          <Typography variant="caption" color="text.secondary">
            {new Date(message.ts).toLocaleString()}
          </Typography>
        )}
      </Stack>
      <Typography whiteSpace="pre-wrap" mb={message.toolCalls?.length ? 1 : 0}>
        {message.contentText || ' '}
      </Typography>
      {(message.toolCalls || []).length > 0 && (
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2">Tool calls ({message.toolCalls?.length})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {(message.toolCalls || []).map((call, index) => (
              <Paper key={`${call.name}-${index}`} variant="outlined" sx={{ p: 1, mb: 1 }}>
                <Typography variant="subtitle2">{call.name}</Typography>
                {call.status && (
                  <Typography variant="caption" color="text.secondary">
                    {call.status}
                  </Typography>
                )}
                {call.input && (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    Input: {JSON.stringify(call.input, null, 2)}
                  </Typography>
                )}
                {call.output && (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    Output: {JSON.stringify(call.output, null, 2)}
                  </Typography>
                )}
              </Paper>
            ))}
          </AccordionDetails>
        </Accordion>
      )}
    </Paper>
  );

  return (
    <Box display="flex" height="calc(100vh - 56px)" gap={2} px={2} pb={2}>
      <Box width={340} borderRight={1} borderColor="divider" pr={2} display="flex" flexDirection="column">
        <Stack direction="row" spacing={1} mb={2} alignItems="center">
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="outlined" onClick={loadSessions} startIcon={<RefreshIcon />} aria-label="Refresh sessions">
            Refresh
          </Button>
        </Stack>
        <InputLabel id="project-filter-label">Project</InputLabel>
        <Select
          labelId="project-filter-label"
          value={projectFilter}
          size="small"
          onChange={(e) => setProjectFilter(e.target.value)}
          sx={{ mb: 2 }}
        >
          <MenuItem value="">All projects</MenuItem>
          {projects.map((project) => (
            <MenuItem key={project.projectName} value={project.projectName}>
              {project.projectName} ({project.count})
            </MenuItem>
          ))}
        </Select>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        <Box flex={1} overflow="auto" borderRadius={1} border={1} borderColor="divider">
          {loading ? (
            <Stack alignItems="center" justifyContent="center" height="100%" spacing={1}>
              <CircularProgress size={24} />
              <Typography variant="body2">Loading sessions…</Typography>
            </Stack>
          ) : (
            <List>
              {sessions.length === 0 && (
                <ListItem>
                  <ListItemText primary="No sessions found" secondary="Try adjusting filters or enable history access" />
                </ListItem>
              )}
              {sessions.map((session) => (
                <ListItemButton
                  key={session.id}
                  selected={selectedSession?.summary.id === session.id}
                  onClick={() => loadSessionDetail(session.id)}
                >
                  <ListItemText
                    primary={session.title || session.id}
                    secondary={`${session.projectName} • ${new Date(session.updatedAt).toLocaleString()}`}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </Box>

      <Box flex={1} display="flex" flexDirection="column" minWidth={0}>
        {selectedSession ? (
          <>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Box>
                <Typography variant="h6">{selectedSession.summary.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedSession.summary.projectName} • Started {new Date(selectedSession.summary.startedAt).toLocaleString()} • Updated{' '}
                  {new Date(selectedSession.summary.updatedAt).toLocaleString()}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label={liveLabel} color={live ? 'success' : 'default'} size="small" />
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => handleCopyResume(selectedSession.summary.resumeCommand)}
                >
                  Copy resume command
                </Button>
                <Button
                  variant="text"
                  onClick={() => handleCopyResume('claude --continue')}
                >
                  Copy continue command
                </Button>
              </Stack>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <Box
              flex={1}
              overflow="auto"
              pr={1}
              ref={messagesContainerRef}
              onScroll={() => {
                const container = messagesContainerRef.current;
                if (!container) return;
                const atBottom =
                  container.scrollHeight - container.scrollTop - container.clientHeight < 32;
                setAutoScroll(atBottom);
              }}
            >
              {selectedSession.messages.map((message) => renderMessage(message))}
              <div ref={messagesEndRef} />
            </Box>
          </>
        ) : (
          <Stack alignItems="center" justifyContent="center" flex={1} spacing={2}>
            <Typography variant="h6">Select a session to view details</Typography>
            <Typography variant="body2" color="text.secondary">
              Search or filter by project to find Claude Code history.
            </Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
