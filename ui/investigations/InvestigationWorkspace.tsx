/**
 * Summit War Room — Investigation Workspace
 *
 * Full workspace for a single investigation: entities, evidence,
 * timeline, hypotheses, and notes in a tabbed layout.
 */

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useWarRoomStore } from '../warroom/store';
import { InvestigationTimeline } from './InvestigationTimeline';
import { InvestigationEntities } from './InvestigationEntities';
import { InvestigationEvidence } from './InvestigationEvidence';
import { InvestigationNotes } from './InvestigationNotes';
import type { InvestigationStatus, Priority } from '../warroom/types';

export const InvestigationWorkspace: React.FC = () => {
  const activeInvestigation = useWarRoomStore((s) => s.activeInvestigation);
  const updateInvestigation = useWarRoomStore((s) => s.updateInvestigation);
  const [tab, setTab] = useState(0);

  if (!activeInvestigation) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No active investigation. Select or create one from the dashboard.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TextField
            size="small"
            value={activeInvestigation.title}
            onChange={(e) => updateInvestigation(activeInvestigation.id, { title: e.target.value })}
            sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: 18, fontWeight: 600 } }}
          />
          <Select
            size="small"
            value={activeInvestigation.status}
            onChange={(e) => updateInvestigation(activeInvestigation.id, { status: e.target.value as InvestigationStatus })}
            sx={{ width: 120, fontSize: 12 }}
          >
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="review">Review</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
          <Select
            size="small"
            value={activeInvestigation.priority}
            onChange={(e) => updateInvestigation(activeInvestigation.id, { priority: e.target.value as Priority })}
            sx={{ width: 100, fontSize: 12 }}
          >
            <MenuItem value="critical">Critical</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </Select>
        </Box>
        <TextField
          size="small"
          fullWidth
          placeholder="Investigation description..."
          value={activeInvestigation.description}
          onChange={(e) => updateInvestigation(activeInvestigation.id, { description: e.target.value })}
          sx={{ '& .MuiInputBase-input': { fontSize: 13 } }}
        />
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tab label="Timeline" />
        <Tab label={`Entities (${activeInvestigation.entities.length})`} />
        <Tab label={`Evidence (${activeInvestigation.evidenceIds.length})`} />
        <Tab label={`Hypotheses (${activeInvestigation.hypotheses.length})`} />
        <Tab label="Notes" />
      </Tabs>

      {/* Tab content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {tab === 0 && <InvestigationTimeline />}
        {tab === 1 && <InvestigationEntities />}
        {tab === 2 && <InvestigationEvidence />}
        {tab === 3 && <HypothesesTab />}
        {tab === 4 && <InvestigationNotes />}
      </Box>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Hypotheses Tab                                                     */
/* ------------------------------------------------------------------ */

const HypothesesTab: React.FC = () => {
  const activeInvestigation = useWarRoomStore((s) => s.activeInvestigation);
  const updateInvestigation = useWarRoomStore((s) => s.updateInvestigation);
  const [text, setText] = useState('');

  if (!activeInvestigation) return null;

  const addHypothesis = () => {
    if (!text.trim()) return;
    const hypothesis = {
      id: `hyp-${Date.now()}`,
      text: text.trim(),
      confidence: 'possible' as const,
      supportingEvidence: [],
      contradictingEvidence: [],
      createdAt: new Date().toISOString(),
    };
    updateInvestigation(activeInvestigation.id, {
      hypotheses: [...activeInvestigation.hypotheses, hypothesis],
    });
    setText('');
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Add a hypothesis..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addHypothesis()}
          sx={{ '& .MuiInputBase-input': { fontSize: 13 } }}
        />
        <Button size="small" variant="contained" onClick={addHypothesis} disabled={!text.trim()}>
          Add
        </Button>
      </Box>

      {activeInvestigation.hypotheses.map((hyp) => (
        <Box key={hyp.id} sx={{ mb: 1.5, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {hyp.text}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Chip label={hyp.confidence} size="small" variant="outlined" />
            <Chip label={`${hyp.supportingEvidence.length} supporting`} size="small" color="success" sx={{ fontSize: 10 }} />
            <Chip label={`${hyp.contradictingEvidence.length} contradicting`} size="small" color="error" sx={{ fontSize: 10 }} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};
