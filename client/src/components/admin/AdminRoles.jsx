import React, { useEffect, useState } from 'react';
import { Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Select, MenuItem, Typography, Toolbar, Button } from '@mui/material';
import { AdminAPI } from '../../services/api';

const ROLES = ['ADMIN','EDITOR','ANALYST','VIEWER'];

export default function AdminRoles() {
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState({});

  const load = async () => {
    const data = await AdminAPI.users();
    setUsers(data);
  };

  useEffect(() => { load(); }, []);

  const updateRole = async (id, role) => {
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      await AdminAPI.setRole(id, role);
      setUsers((prev) => prev.map(u => u.id === id ? { ...u, role } : u));
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  };

  return (
    <Box>
      <Toolbar sx={{ pl: 0 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Role Management</Typography>
        <Button variant="outlined" onClick={load}>Refresh</Button>
      </Toolbar>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Last Login</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.username}</TableCell>
                <TableCell>
                  <Select size="small" value={u.role} onChange={(e) => updateRole(u.id, e.target.value)} disabled={!!saving[u.id]}>
                    {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </Select>
                </TableCell>
                <TableCell>{String(u.isActive ?? true)}</TableCell>
                <TableCell>{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

