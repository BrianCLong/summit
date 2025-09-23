import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export default function TTPTriagePanel({ open, onClose, selectedEntity }) {
  if (!open || !selectedEntity) return null;

  return (
    <Paper sx={{
      position: 'absolute',
      top: 8,
      right: 8,
      width: 300,
      p: 2,
      bgcolor: 'background.paper',
      borderRadius: 1,
      boxShadow: 3,
      zIndex: 10,
    }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">TTP Triage Panel</Typography>
        <Typography
          variant="body2"
          sx={{ cursor: 'pointer' }}
          onClick={onClose}
        >
          [X]
        </Typography>
      </Box>
      {selectedEntity && (
        <Box>
          <Typography variant="subtitle1">Entity: {selectedEntity.label}</Typography>
          {selectedEntity.triage_score !== null && (
            <Typography variant="body2">Score: {selectedEntity.triage_score}</Typography>
          )}
          {selectedEntity.attack_ttps && selectedEntity.attack_ttps.length > 0 && (
            <Box mt={1}>
              <Typography variant="subtitle2">ATT&CK TTPs:</Typography>
              <ul>
                {selectedEntity.attack_ttps.map((ttp, index) => (
                  <li key={index}><Typography variant="body2">{ttp}</Typography></li>
                ))}
              </ul>
            </Box>
          )}
          {selectedEntity.capec_ttps && selectedEntity.capec_ttps.length > 0 && (
            <Box mt={1}>
              <Typography variant="subtitle2">CAPEC TTPs:</Typography>
              <ul>
                {selectedEntity.capec_ttps.map((ttp, index) => (
                  <li key={index}><Typography variant="body2">{ttp}</Typography></li>
                ))}
              </ul>
            </Box>
          )}
          {selectedEntity.actor_links && selectedEntity.actor_links.length > 0 && (
            <Box mt={1}>
              <Typography variant="subtitle2">Actor Links:</Typography>
              <ul>
                {selectedEntity.actor_links.map((link, index) => (
                  <li key={index}><Typography variant="body2"><a href={link} target="_blank" rel="noopener noreferrer">{link}</a></Typography></li>
                ))}
              </ul>
            </Box>
          )}
          {(!selectedEntity.attack_ttps || selectedEntity.attack_ttps.length === 0) &&
           (!selectedEntity.capec_ttps || selectedEntity.capec_ttps.length === 0) &&
           selectedEntity.triage_score === null &&
           (!selectedEntity.actor_links || selectedEntity.actor_links.length === 0) && (
            <Typography variant="body2">No TTP data available for this entity.</Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}