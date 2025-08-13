import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Toolbar, Button, Switch, FormControlLabel } from '@mui/material';
import { ActivityAPI } from '../../services/api';

export default function ActivityLog() {
  const [rows, setRows] = useState([]);
  const [all, setAll] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await ActivityAPI.list(200, all);
      setRows(data);
    } catch (e) { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [all]);

  return (
    <Box>
      <Toolbar sx={{ pl: 0 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Activity Logs</Typography>
        <FormControlLabel control={<Switch checked={all} onChange={(e) => setAll(e.target.checked)} />} label="Admin: show all" />
        <Button variant="outlined" onClick={load} disabled={loading}>Refresh</Button>
      </Toolbar>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>IP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{new Date(r.created_at || r.createdAt).toLocaleString()}</TableCell>
                <TableCell>{r.user_id || r.userId}</TableCell>
                <TableCell>{r.action}</TableCell>
                <TableCell>{r.resource_type || r.resourceType}:{r.resource_id || r.resourceId}</TableCell>
                <TableCell><pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{typeof r.details === 'object' ? JSON.stringify(r.details) : r.details}</pre></TableCell>
                <TableCell>{r.ip_address || r.ipAddress || ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

