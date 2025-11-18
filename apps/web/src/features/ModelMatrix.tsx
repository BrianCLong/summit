import React, { useEffect, useState } from 'react'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { io } from 'socket.io-client'
import $ from 'jquery'

const socket = io('/', { path: '/events' })

type Row = {
  id: string
  class: 'local' | 'hosted'
  window: 'open' | 'closed'
  rpm: number
  rpmCap: number
  tpm: number
  tpmCap: number
  budgetFrac: number
  p95ms: number
  ttfbms: number
}

const cols: GridColDef[] = [
  { field: 'id', headerName: 'Model', flex: 1 },
  { field: 'class', headerName: 'Class', width: 100 },
  { field: 'window', headerName: 'Window', width: 110 },
  { field: 'rpm', headerName: 'RPM', width: 90 },
  { field: 'rpmCap', headerName: 'RPM Cap', width: 110 },
  { field: 'tpm', headerName: 'TPM', width: 100 },
  { field: 'tpmCap', headerName: 'TPM Cap', width: 120 },
  {
    field: 'budgetFrac',
    headerName: 'Budget',
    width: 110,
    valueFormatter: v => `${Math.round(Number(v) * 100)}%`,
  },
  { field: 'p95ms', headerName: 'p95', width: 90 },
  { field: 'ttfbms', headerName: 'TTFB', width: 90 },
]

export default function ModelMatrix() {
  const [rows, setRows] = useState<Row[]>([])
  useEffect(() => {
    socket.on('model_stats', (payload: Row[]) => setRows(payload))
    return () => {
      socket.off('model_stats')
    }
  }, [])

  useEffect(() => {
    // subtle attention jQuery pulse on critical thresholds
    rows.forEach(r => {
      if (r.budgetFrac > 0.8 || r.window === 'closed') {
        const el = $(`div[role=row][data-id="${r.id}"]`)
        el.stop(true, true).fadeOut(100).fadeIn(100)
      }
    })
  }, [rows])

  return (
    <div style={{ height: 420, width: '100%' }}>
      <DataGrid
        density="compact"
        rows={rows}
        columns={cols}
        disableRowSelectionOnClick
      />
    </div>
  )
}
