import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import { useAppDispatch, useAppSelector } from '../store/index.js';
import { setTenant, setStatus, setOperation } from '../store/slices/ui.js';

export default function AppHeader() {
  const dispatch = useAppDispatch();
  const { tenant, status, operation } = useAppSelector((s) => s.ui);
  const isDev = import.meta.env.DEV;

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }} aria-label="IntelGraph">
          IntelGraph
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {isDev && (
            <Link href="/dashboard" underline="hover" aria-label="Dashboard">Dashboard</Link>
          )}
          {isDev && (
            <Link href="/graph" underline="hover" aria-label="Graph Workbench">Graph</Link>
          )}
          {isDev && (
            <Link href="/investigations" underline="hover" aria-label="Investigations">Investigations</Link>
          )}
          {isDev && (
            <Link href="/hunts" underline="hover" aria-label="Hunts">Hunts</Link>
          )}
          {isDev && (
            <Link href="/ioc" underline="hover" aria-label="IOCs">IOCs</Link>
          )}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="tenant-label">Tenant</InputLabel>
            <Select labelId="tenant-label" value={tenant} label="Tenant" onChange={(e) => dispatch(setTenant(e.target.value))}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="tenant-a">tenant-a</MenuItem>
              <MenuItem value="tenant-b">tenant-b</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="status-label">Status</InputLabel>
            <Select labelId="status-label" value={status} label="Status" onChange={(e) => dispatch(setStatus(e.target.value))}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="success">success</MenuItem>
              <MenuItem value="error">error</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="op-label">Operation</InputLabel>
            <Select labelId="op-label" value={operation} label="Operation" onChange={(e) => dispatch(setOperation(e.target.value))}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="OkQuery">OkQuery</MenuItem>
              <MenuItem value="BoomQuery">BoomQuery</MenuItem>
            </Select>
          </FormControl>
          {isDev && (
            <Link href={import.meta.env.VITE_GRAFANA_URL || '/grafana'} underline="hover" target="_blank" rel="noreferrer" aria-label="Grafana">
              Grafana
            </Link>
          )}
          {isDev && (
            <Link href={import.meta.env.VITE_JAEGER_URL || '/jaeger'} underline="hover" target="_blank" rel="noreferrer" aria-label="Jaeger">
              Jaeger
            </Link>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
