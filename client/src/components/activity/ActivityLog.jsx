import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Toolbar,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  TablePagination,
} from '@mui/material';
import { ActivityAPI } from '../../services/api';

export default function ActivityLog() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [all, setAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await ActivityAPI.list({
        page,
        pageSize,
        all,
        action: filterAction,
        resource: filterResource,
      });
      const items = Array.isArray(data) ? data : data.items || [];
      setRows(items);
      setTotal(data.total ?? items.length);
    } catch (e) {
      /* noop */
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [all, page, pageSize]);

  return (
    <Box>
      <Toolbar sx={{ pl: 0 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Activity Logs
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={all}
              onChange={(e) => {
                setAll(e.target.checked);
                setPage(0);
              }}
            />
          }
          label="Admin: show all"
        />
        <TextField
          size="small"
          sx={{ mx: 1 }}
          label="Action"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
        />
        <TextField
          size="small"
          sx={{ mr: 1 }}
          label="Resource"
          value={filterResource}
          onChange={(e) => setFilterResource(e.target.value)}
        />
        <Button
          variant="outlined"
          onClick={() => {
            setPage(0);
            load();
          }}
          disabled={loading}
        >
          Apply
        </Button>
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
                <TableCell>
                  {r.resource_type || r.resourceType}:{r.resource_id || r.resourceId}
                </TableCell>
                <TableCell>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {typeof r.details === 'object' ? JSON.stringify(r.details) : r.details}
                  </pre>
                </TableCell>
                <TableCell>{r.ip_address || r.ipAddress || ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => {
          setPageSize(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[25, 50, 100, 200]}
      />
    </Box>
  );
}
